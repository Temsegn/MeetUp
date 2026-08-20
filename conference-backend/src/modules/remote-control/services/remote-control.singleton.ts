import { logger } from '../../../infrastructure/logging/logger';
import { createRemoteControlService } from './remote-control.service';
import { mediaPresenceAdapter } from './meeting-presence.adapter';
import type { RemoteControlTransport } from './remote-control.service';

let transport: RemoteControlTransport = {
  emitToSocket() {
    /* bound in bindRemoteControlIo */
  },
};

export const remoteControlService = createRemoteControlService({
  presence: mediaPresenceAdapter,
  transport: {
    emitToSocket(socketId, event, payload) {
      transport.emitToSocket(socketId, event, payload);
    },
  },
  onAudit(event) {
    logger.info('Remote control audit', {
      action: event.action,
      sessionId: event.sessionId,
      roomId: event.roomId,
      actorParticipantId: event.actorParticipantId,
      metadata: event.metadata,
    });
  },
});

export function bindRemoteControlTransport(next: RemoteControlTransport): void {
  transport = next;
}
