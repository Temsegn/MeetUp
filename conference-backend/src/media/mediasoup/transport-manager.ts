import {
  WebRtcTransport,
  DtlsParameters,
  IceParameters,
} from 'mediasoup/types';
import { Server as SocketIOServer } from 'socket.io';
import { routerManager } from './router-manager';
import { participantManager } from './participant-manager';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import type {
  TransportDirection,
  TransportLifecycleState,
  CreateTransportResult,
} from './media.types';

/**
 * Per-transport reconnection state.
 */
interface TransportState {
  lifecycleState: TransportLifecycleState;
  direction: TransportDirection;
  iceDisconnectTimer?: ReturnType<typeof setTimeout>;
  iceRestartAttempts: number;
}

/** Maximum automatic ICE restart attempts before giving up. */
const MAX_ICE_RESTART_ATTEMPTS = 3;

/**
 * TransportManager creates and manages WebRtcTransport lifecycle.
 *
 * Transport direction:
 *  'send' — peer is publishing media (producer side)
 *  'recv' — peer is consuming remote media (consumer side)
 *
 * Lifecycle (state machine):
 *  created → connecting → connected → active → failed | closed
 *
 * ICE recovery strategy:
 *  'disconnected': start timer; if still disconnected after
 *    iceDisconnectedRecoveryMs, trigger automatic ICE restart.
 *    Timer is cancelled if ICE recovers on its own.
 *  'failed': immediate ICE restart, up to MAX_ICE_RESTART_ATTEMPTS times.
 *    After exhausting retries, close transport and notify client.
 *
 * DTLS recovery:
 *  'failed': close transport immediately, notify client.
 *  'closed': no-op — prevents double-close.
 *
 * Transport close path:
 *  _closeTransportInternal() is the single cleanup entry point:
 *   1. clear ICE timer
 *   2. close transport (if not already closed)
 *   3. remove from peer maps
 *   4. decrement metrics
 *  No other code path closes transports.
 */
export class TransportManager {
  private io?: SocketIOServer;
  private transportStates: Map<string, TransportState> = new Map();

  public setIO(io: SocketIOServer): void {
    this.io = io;
  }

  // ── Transport creation ─────────────────────────────────────────────────────

  public async createWebRtcTransport(
    roomId: string,
    participantId: string,
    direction: TransportDirection,
  ): Promise<CreateTransportResult> {
    const router = routerManager.getRouter(roomId);
    if (!router) {
      throw new Error(`Router not found for room ${roomId}`);
    }

    const transport = await router.createWebRtcTransport(
      mediasoupConfig.webRtcTransportOptions,
    );

    // Cap incoming bitrate on send transports (publisher side)
    if (direction === 'send') {
      await transport.setMaxIncomingBitrate(mediasoupConfig.maxIncomingBitrate);
    }

    const state: TransportState = {
      lifecycleState:     'created',
      direction,
      iceRestartAttempts: 0,
    };
    this.transportStates.set(transport.id, state);

    metrics.activeTransports.inc();
    logger.debug('Transport created', {
      roomId,
      participantId,
      transportId: transport.id,
      direction,
    });

    this._attachDtlsHandlers(transport, roomId, participantId, state);
    this._attachIceHandlers(transport, roomId, participantId, state);
    this._attachRouterCloseHandler(transport, roomId, participantId);

    // Store on peer with direction tracking
    const peer = participantManager.getPeer(roomId, participantId);
    if (peer) {
      peer.transports.set(transport.id, transport);
      peer.transportDirections.set(transport.id, direction);
    }

    return {
      id:             transport.id,
      iceParameters:  transport.iceParameters,
      iceCandidates:  transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      iceServers:     mediasoupConfig.iceServers,
    };
  }

  // ── DTLS event handlers ────────────────────────────────────────────────────

  private _attachDtlsHandlers(
    transport: WebRtcTransport,
    roomId: string,
    participantId: string,
    state: TransportState,
  ): void {
    transport.on('dtlsstatechange', (dtlsState: string) => {
      logger.debug('DTLS state change', {
        transportId: transport.id,
        roomId,
        participantId,
        dtlsState,
      });

      switch (dtlsState) {
        case 'connecting':
          state.lifecycleState = 'connecting';
          break;

        case 'connected':
          state.lifecycleState = 'connected';
          logger.debug('Transport DTLS connected', {
            transportId: transport.id,
            roomId,
            participantId,
          });
          break;

        case 'failed':
          state.lifecycleState = 'failed';
          metrics.dtlsFailures.inc();
          logger.warn('DTLS failed — closing transport', {
            transportId: transport.id,
            roomId,
            participantId,
          });
          this._notifyPeer(roomId, participantId, 'transport-failed', {
            transportId: transport.id,
            reason: 'dtls-failed',
          });
          this._closeTransportInternal(roomId, participantId, transport);
          break;

        case 'closed':
          // Transport already closing — no action needed to prevent double-close
          state.lifecycleState = 'closed';
          break;
      }
    });
  }

  // ── ICE event handlers ─────────────────────────────────────────────────────

  private _attachIceHandlers(
    transport: WebRtcTransport,
    roomId: string,
    participantId: string,
    state: TransportState,
  ): void {
    transport.on('icestatechange', (iceState: string) => {
      logger.debug('ICE state change', {
        transportId: transport.id,
        roomId,
        participantId,
        iceState,
      });

      switch (iceState) {
        case 'new':
        case 'checking':
          this._clearIceDisconnectTimer(state);
          break;

        case 'connected':
        case 'completed':
          this._clearIceDisconnectTimer(state);
          state.iceRestartAttempts = 0;
          // Advance to 'active' once ICE + DTLS both complete
          if (state.lifecycleState === 'connected' || state.lifecycleState === 'connecting') {
            state.lifecycleState = 'active';
          }
          break;

        case 'disconnected':
          // Temporary loss — network switch, sleep/wake, mobile handoff.
          // Schedule a deferred ICE restart rather than failing immediately.
          metrics.iceDisconnects.inc();
          logger.warn('ICE disconnected — starting recovery timer', {
            transportId: transport.id,
            roomId,
            participantId,
            attempts: state.iceRestartAttempts,
          });
          this._scheduleIceRestart(transport, roomId, participantId, state);
          break;

        case 'failed':
          this._clearIceDisconnectTimer(state);
          state.lifecycleState = 'failed';
          metrics.iceFailures.inc();

          if (state.iceRestartAttempts < MAX_ICE_RESTART_ATTEMPTS) {
            logger.warn('ICE failed — attempting restart', {
              transportId: transport.id,
              attempts: state.iceRestartAttempts,
            });
            this._performIceRestart(transport, roomId, participantId, state);
          } else {
            logger.error('ICE failed — max restart attempts exhausted, closing transport', {
              transportId: transport.id,
              roomId,
              participantId,
            });
            this._notifyPeer(roomId, participantId, 'transport-failed', {
              transportId: transport.id,
              reason: 'ice-failed',
            });
            this._closeTransportInternal(roomId, participantId, transport);
          }
          break;

        case 'closed':
          this._clearIceDisconnectTimer(state);
          state.lifecycleState = 'closed';
          break;
      }
    });
  }

  private _scheduleIceRestart(
    transport: WebRtcTransport,
    roomId: string,
    participantId: string,
    state: TransportState,
  ): void {
    this._clearIceDisconnectTimer(state);

    state.iceDisconnectTimer = setTimeout(() => {
      state.iceDisconnectTimer = undefined;
      if (!transport.closed) {
        this._performIceRestart(transport, roomId, participantId, state);
      }
    }, mediasoupConfig.iceDisconnectedRecoveryMs);
  }

  private _performIceRestart(
    transport: WebRtcTransport,
    roomId: string,
    participantId: string,
    state: TransportState,
  ): void {
    if (transport.closed) return;

    state.iceRestartAttempts++;

    transport.restartIce()
      .then((iceParameters: IceParameters) => {
        logger.info('ICE restart initiated', {
          transportId: transport.id,
          roomId,
          participantId,
          attempt: state.iceRestartAttempts,
        });
        // Notify the peer's socket — client must call transport.restartIce({ iceParameters })
        this._notifyPeer(roomId, participantId, 'ice-restart', {
          transportId: transport.id,
          iceParameters,
        });
      })
      .catch((err: Error) => {
        logger.error('ICE restart failed', {
          transportId: transport.id,
          err: err.message,
        });
      });
  }

  /**
   * Emit to the peer's Socket.IO socketId (NOT participantId).
   * Sockets join(roomId); the auto-room is socket.id — participantId is never a room.
   */
  private _notifyPeer(
    roomId: string,
    participantId: string,
    event: string,
    payload: object,
  ): void {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer?.socketId || !this.io) {
      logger.warn('Cannot notify peer — missing socket', { roomId, participantId, event });
      return;
    }
    this.io.to(peer.socketId).emit(event, payload);
  }

  private _clearIceDisconnectTimer(state: TransportState): void {
    if (state.iceDisconnectTimer) {
      clearTimeout(state.iceDisconnectTimer);
      state.iceDisconnectTimer = undefined;
    }
  }

  // ── Router/Worker close handler ────────────────────────────────────────────

  private _attachRouterCloseHandler(
    transport: WebRtcTransport,
    roomId: string,
    participantId: string,
  ): void {
    transport.on('routerclose', () => {
      logger.warn('Transport invalidated by router close (worker died)', {
        transportId: transport.id,
        roomId,
        participantId,
      });
      // Clear any pending ICE restart timer — the transport is dead
      const state = this.transportStates.get(transport.id);
      if (state) this._clearIceDisconnectTimer(state);
      this._removeFromPeerAndMetrics(roomId, participantId, transport.id);
    });

    // 'close' fires when transport.close() is called directly from outside
    // TransportManager (e.g. ParticipantManager.removePeer → transport.close()).
    // Without this handler, transportStates leaks one entry per transport on
    // every normal peer disconnect.
    transport.on('close' as any, () => {
      const state = this.transportStates.get(transport.id);
      if (!state) return;  // already cleaned up via _closeTransportInternal
      this._clearIceDisconnectTimer(state);
      this.transportStates.delete(transport.id);
      // Peer-map cleanup is owned by ParticipantManager.removePeer.
      // We still own the activeTransports gauge — decrement when close() came
      // from outside TransportManager (e.g. peer disconnect).
      metrics.activeTransports.dec();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  public async connectTransport(
    roomId: string,
    participantId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    const transport = this._getTransport(roomId, participantId, transportId);
    await transport.connect({ dtlsParameters });
    logger.debug('Transport connected (DTLS parameters exchanged)', {
      roomId,
      participantId,
      transportId,
    });
  }

  /**
   * Client-requested ICE restart (e.g. after network change).
   * Returns new ICE parameters the client must apply to its transport.
   */
  public async restartIce(
    roomId: string,
    participantId: string,
    transportId: string,
  ): Promise<IceParameters> {
    const transport = this._getTransport(roomId, participantId, transportId);
    const iceParameters = await transport.restartIce();

    logger.info('ICE restart performed (client-requested)', {
      roomId,
      participantId,
      transportId,
    });

    return iceParameters;
  }

  public closeTransport(
    roomId: string,
    participantId: string,
    transportId: string,
  ): void {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) return;
    const transport = peer.transports.get(transportId);
    if (!transport) return;
    this._closeTransportInternal(roomId, participantId, transport);
  }

  // ── Internal close — single cleanup path ──────────────────────────────────

  private _closeTransportInternal(
    roomId: string,
    participantId: string,
    transport: WebRtcTransport,
  ): void {
    const state = this.transportStates.get(transport.id);
    if (state) {
      // Prevent re-entry if transport is already being closed
      if (state.lifecycleState === 'closed') return;
      this._clearIceDisconnectTimer(state);
      state.lifecycleState = 'closed';
    }

    if (!transport.closed) {
      transport.close();
      // transport.close() cascades to close all producers and consumers
    }

    this._removeFromPeerAndMetrics(roomId, participantId, transport.id);
  }

  private _removeFromPeerAndMetrics(
    roomId: string,
    participantId: string,
    transportId: string,
  ): void {
    const peer = participantManager.getPeer(roomId, participantId);
    if (peer) {
      peer.transports.delete(transportId);
      peer.transportDirections.delete(transportId);
    }
    this.transportStates.delete(transportId);
    metrics.activeTransports.dec();
  }

  private _getTransport(
    roomId: string,
    participantId: string,
    transportId: string,
  ): WebRtcTransport {
    const peer = participantManager.getPeer(roomId, participantId);
    if (!peer) {
      throw new Error(`Peer ${participantId} not found in room ${roomId}`);
    }
    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} not found for peer ${participantId}`);
    }
    return transport;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  public async getTransportStats(
    roomId: string,
    participantId: string,
    transportId: string,
  ): Promise<object[]> {
    try {
      const transport = this._getTransport(roomId, participantId, transportId);
      return await transport.getStats();
    } catch {
      return [];
    }
  }

  public getTransportLifecycleState(transportId: string): TransportLifecycleState {
    return this.transportStates.get(transportId)?.lifecycleState ?? 'closed';
  }

  public getTransportDirection(transportId: string): TransportDirection | undefined {
    return this.transportStates.get(transportId)?.direction;
  }
}

export const transportManager = new TransportManager();
