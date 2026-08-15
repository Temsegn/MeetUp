import { Router } from 'mediasoup/types';
import { workerManager } from './worker-manager';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import { clearRoomChat } from '../../realtime/handlers/chat.handler';
import type { RouterStats } from '../media.types';

interface RouterEntry {
  router: Router;
  workerPid: number;
  roomId: string;
  createdAt: Date;
}

/**
 * Grace period (ms) before an empty room's router is destroyed.
 * Allows participants to disconnect and rejoin briefly without
 * tearing down and rebuilding the entire media pipeline.
 */
const EMPTY_ROOM_GRACE_MS = 30_000;

/**
 * RouterManager owns the mediasoup Router lifecycle.
 *
 * Architecture: one Router per room.
 *
 * Responsibilities:
 *  - Create a router on the least-loaded worker for a new room
 *  - Retrieve the router for an existing room
 *  - Schedule cleanup when a room empties (with grace period)
 *  - Close router and release worker load counter
 *  - React to worker death — remove all dead routers
 *  - Expose per-router statistics
 *
 * Thread safety:
 *  createRouter() deduplicates concurrent calls for the same roomId
 *  via a creationInFlight map so only one Router is ever created per room.
 */
export class RouterManager {
  private routers: Map<string, RouterEntry> = new Map();
  private emptyRoomTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Prevents race: two simultaneous join-room events for the same room
   * share one creation promise instead of creating two Routers.
   */
  private creationInFlight: Map<string, Promise<Router>> = new Map();

  /** Optional hooks when a router is removed (recording, chat, etc.). */
  private onRouterClosedCallbacks: Array<(roomId: string) => void> = [];

  public onRouterClosed(cb: (roomId: string) => void): void {
    this.onRouterClosedCallbacks.push(cb);
  }

  private _emitRouterClosed(roomId: string): void {
    for (const cb of this.onRouterClosedCallbacks) {
      try {
        cb(roomId);
      } catch (err) {
        logger.error('onRouterClosed callback threw', { roomId, err });
      }
    }
  }

  // ── Router lifecycle ───────────────────────────────────────────────────────

  /**
   * Create a router for the given room, or return the existing one.
   * Concurrent calls for the same roomId share one creation promise.
   */
  public async createRouter(roomId: string): Promise<Router> {
    const existing = this.routers.get(roomId);
    if (existing) return existing.router;

    const inFlight = this.creationInFlight.get(roomId);
    if (inFlight) return inFlight;

    const createPromise = this._doCreateRouter(roomId);
    this.creationInFlight.set(roomId, createPromise);

    try {
      return await createPromise;
    } finally {
      this.creationInFlight.delete(roomId);
    }
  }

  private async _doCreateRouter(roomId: string): Promise<Router> {
    const worker = workerManager.getWorker();
    const router = await worker.createRouter(mediasoupConfig.routerOptions);

    workerManager.trackRoomOnWorker(roomId, worker.pid!);

    const entry: RouterEntry = {
      router,
      workerPid: worker.pid!,
      roomId,
      createdAt: new Date(),
    };
    this.routers.set(roomId, entry);

    metrics.activeRouters.inc();
    metrics.roomsCreated.inc();
    metrics.activeRooms.inc();

    logger.info('Router created for room', { roomId, workerPid: worker.pid });

    // Safety net: if the worker closes (crash) while we still hold this router
    // reference, clean up. handleWorkerDeath() will have already run at this
    // point (synchronously via WorkerManager's 'died' callback), but this
    // covers routers created in the window between crash and cleanup.
    router.on('workerclose', () => {
      logger.warn('Router invalidated by worker close', { roomId });
      this._removeRouterEntry(roomId);
    });

    return router;
  }

  /**
   * Close the room's router immediately, cancelling any pending cleanup timer.
   */
  public closeRouter(roomId: string): void {
    this._cancelCleanupTimer(roomId);
    const entry = this.routers.get(roomId);
    if (!entry) return;

    if (!entry.router.closed) {
      entry.router.close();
    }

    this._removeRouterEntry(roomId);
  }

  private _removeRouterEntry(roomId: string): void {
    const entry = this.routers.get(roomId);
    if (!entry) return;

    this.routers.delete(roomId);
    workerManager.decrementRouterCount(entry.workerPid);
    workerManager.untrackRoom(roomId);

    metrics.activeRouters.dec();
    metrics.roomsClosed.inc();
    metrics.activeRooms.dec();

    try {
      clearRoomChat(roomId);
    } catch (err) {
      logger.warn('Failed to clear chat history on router close', { roomId, err });
    }

    this._emitRouterClosed(roomId);

    logger.info('Router entry removed', { roomId });
  }

  // ── Room cleanup scheduling ────────────────────────────────────────────────

  /**
   * Called whenever participant count changes for a room.
   * - participantCount > 0 → cancel any pending cleanup timer
   * - participantCount === 0 → schedule router destruction after grace period
   */
  public scheduleRoomCleanup(roomId: string, participantCount: number): void {
    if (participantCount > 0) {
      this._cancelCleanupTimer(roomId);
      return;
    }

    if (!this.emptyRoomTimers.has(roomId)) {
      logger.info('Room empty — scheduling router cleanup', {
        roomId,
        graceMs: EMPTY_ROOM_GRACE_MS,
      });

      const timer = setTimeout(() => {
        logger.info('Grace period elapsed — closing empty room router', { roomId });
        this.closeRouter(roomId);
        this.emptyRoomTimers.delete(roomId);
      }, EMPTY_ROOM_GRACE_MS);

      this.emptyRoomTimers.set(roomId, timer);
    }
  }

  private _cancelCleanupTimer(roomId: string): void {
    const timer = this.emptyRoomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.emptyRoomTimers.delete(roomId);
    }
  }

  // ── Worker death recovery ──────────────────────────────────────────────────

  /**
   * Called by WorkerManager when a worker dies.
   * Proactively removes all routers hosted on the dead worker.
   * mediasoup will also emit 'workerclose' on each router, but we clean up
   * here first to prevent stale state during the recovery window.
   * Returns the list of affected room IDs for caller use.
   */
  public handleWorkerDeath(workerPid: number): string[] {
    const affectedRoomIds: string[] = [];

    for (const [roomId, entry] of this.routers.entries()) {
      if (entry.workerPid === workerPid) {
        affectedRoomIds.push(roomId);
        this._cancelCleanupTimer(roomId);
        this.routers.delete(roomId);
        workerManager.untrackRoom(roomId);

        metrics.activeRouters.dec();
        metrics.roomsClosed.inc();
        metrics.activeRooms.dec();

        try {
          clearRoomChat(roomId);
        } catch (err) {
          logger.warn('Failed to clear chat history on worker death', { roomId, err });
        }

        this._emitRouterClosed(roomId);

        logger.warn('Room router removed due to worker death', { roomId, workerPid });
      }
    }

    return affectedRoomIds;
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  public getRouter(roomId: string): Router | undefined {
    return this.routers.get(roomId)?.router;
  }

  public hasRouter(roomId: string): boolean {
    return this.routers.has(roomId);
  }

  public getActiveRoomIds(): string[] {
    return Array.from(this.routers.keys());
  }

  // ── Observability ──────────────────────────────────────────────────────────

  public getRouterStats(): RouterStats[] {
    return Array.from(this.routers.entries()).map(([roomId, entry]) => ({
      roomId,
      workerPid:      entry.workerPid,
      producerCount:  0,  // Filled in by MediaEngine.getRoomStats()
      consumerCount:  0,
      transportCount: 0,
      createdAt:      entry.createdAt,
    }));
  }

  // ── Shutdown ───────────────────────────────────────────────────────────────

  public async shutdown(): Promise<void> {
    logger.info('Closing all routers...');

    for (const timer of this.emptyRoomTimers.values()) {
      clearTimeout(timer);
    }
    this.emptyRoomTimers.clear();

    for (const [roomId, entry] of this.routers.entries()) {
      if (!entry.router.closed) {
        entry.router.close();
      }
      logger.debug('Router closed on shutdown', { roomId });
    }

    this.routers.clear();
  }
}

export const routerManager = new RouterManager();
