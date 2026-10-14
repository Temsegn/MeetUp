import { logger } from '../../infrastructure/logging/logger';
import { processPendingInviteDeliveries } from './services/meeting-invite-delivery.service';

const SWEEP_MS = 30_000;
let started = false;

export function startMeetingInviteDeliveryJob(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const n = await processPendingInviteDeliveries(40);
      if (n > 0) {
        logger.info('Meeting invite delivery sweep processed rows', { count: n });
      }
    } catch (err) {
      logger.warn('Meeting invite delivery sweep failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, SWEEP_MS);
}
