import * as mediasoup from 'mediasoup';
import { Worker } from 'mediasoup/types';
import { mediasoupConfig } from '../../config/mediasoup';
import { logger } from '../../infrastructure/logging/logger';
import { metrics } from '../../infrastructure/metrics/metrics.service';
import type { WorkerStats } from '../media.types';

interface WorkerInfo {
  worker: Worker;
  routerCount: number;
  healthy: boolean;
  spawnedAt: Date;
}

type WorkerDiedCallback = (workerPid: number, affectedRoomIds: string[]) => void;

/**
 * WorkerManager owns the full lifecycle of mediasoup Worker processes.
 *
 * Responsibilities:
 *  - Spawn N workers on startup (configurable via MEDIASOUP_WORKERS)
 *  - Select the least-loaded healthy worker via routerCount (least loaded first)
 *  - Detect worker crashes via the 'died' event
 *  - Identify and report affected rooms when a worker dies
 *  - Spawn a replacement worker automatically after a brief delay
 *  - Expose health/stats for monitoring
 *  - Gracefully close all workers on shutdown
 *
 * Worker selection: lowest routerCount among healthy workers.
 * routerCount is incremented by getWorker() and decremented by
 * decrementRouterCount() when a router is closed.
 */
export class WorkerManager {
  private workers: WorkerInfo[] = [];
  private onWorkerDiedCallbacks: WorkerDiedCallback[] = [];

  /**
   * roomId → workerPid: tracks which rooms live on which worker.
   * Used when a worker dies to identify affected rooms.
   */
  private roomWorkerMap: Map<string, number> = new Map();

  // ── Initialization ─────────────────────────────────────────────────────────

  public async initialize(): Promise<void> {
    const count = mediasoupConfig.numWorkers;
    logger.info(`Initializing ${count} mediasoup workers...`);

    await Promise.all(
      Array.from({ length: count }, () => this.spawnWorker()),
    );

    const healthy = this.workers.filter(w => w.healthy).length;
    logger.info('All mediasoup workers ready', { count: healthy });
    metrics.activeWorkers.set(healthy);
  }

  // ── Worker spawning ────────────────────────────────────────────────────────

  private async spawnWorker(): Promise<Worker> {
    const worker = await mediasoup.createWorker(mediasoupConfig.workerSettings);

    const info: WorkerInfo = {
      worker,
      routerCount: 0,
      healthy:     true,
      spawnedAt:   new Date(),
    };
    this.workers.push(info);

    logger.info('Mediasoup worker spawned', { pid: worker.pid });
    metrics.activeWorkers.inc();

    // Wire observer for resource monitoring
    worker.observer.on('newrouter', () => {
      // routerCount is managed manually via getWorker/decrementRouterCount
      // The observer is here for future extension (e.g. per-worker router tracking)
    });

    worker.on('died', (error) => {
      this.handleWorkerDeath(info, error);
    });

    return worker;
  }

  private handleWorkerDeath(info: WorkerInfo, error?: Error): void {
    const pid = info.worker.pid!;
    metrics.workerDeaths.inc();
    metrics.activeWorkers.dec();

    logger.error('Mediasoup worker died — recovering', {
      pid,
      error: error?.message ?? 'unknown',
    });

    // Mark unhealthy immediately — prevents new routers being assigned here
    info.healthy = false;

    // Collect all affected room IDs before modifying any state
    const affectedRoomIds: string[] = [];
    for (const [roomId, workerPid] of this.roomWorkerMap.entries()) {
      if (workerPid === pid) {
        affectedRoomIds.push(roomId);
      }
    }

    // Notify RouterManager and socket layer synchronously — they need the
    // room list before we remove the worker entry
    for (const cb of this.onWorkerDiedCallbacks) {
      try {
        cb(pid, affectedRoomIds);
      } catch (err) {
        logger.error('Worker died callback threw', { err });
      }
    }

    // Remove dead worker from pool
    this.workers = this.workers.filter(w => w.worker !== info.worker);

    // Spawn a replacement worker after a brief delay.
    // The delay prevents a rapid respawn tight-loop if the worker
    // is crashing on startup due to a configuration error.
    const RESPAWN_DELAY_MS = 2_000;
    setTimeout(async () => {
      try {
        await this.spawnWorker();
        metrics.workerRestarts.inc();
        logger.info('Replacement mediasoup worker spawned', { previousPid: pid });
      } catch (err) {
        logger.error('CRITICAL: Failed to spawn replacement mediasoup worker', {
          previousPid: pid,
          err,
        });
        // Do NOT crash — surviving workers continue serving. The /health/ready
        // endpoint will reflect degraded state for the orchestrator.
      }
    }, RESPAWN_DELAY_MS);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Register a callback invoked synchronously when a worker dies.
   * Receives the dead worker PID and all affected room IDs.
   */
  public onWorkerDied(cb: WorkerDiedCallback): void {
    this.onWorkerDiedCallbacks.push(cb);
  }

  /**
   * Select the least-loaded healthy worker and increment its routerCount.
   * Throws if no healthy workers are available.
   */
  public getWorker(): Worker {
    const healthy = this.workers.filter(w => w.healthy);
    if (healthy.length === 0) {
      throw new Error('No healthy mediasoup workers available');
    }

    healthy.sort((a, b) => a.routerCount - b.routerCount);
    const selected = healthy[0];
    selected.routerCount++;
    return selected.worker;
  }

  /**
   * Decrement routerCount when a router is closed.
   * Called by RouterManager.
   */
  public decrementRouterCount(workerPid: number): void {
    const info = this.workers.find(w => w.worker.pid === workerPid);
    if (info && info.routerCount > 0) {
      info.routerCount--;
    }
  }

  /** Record that a room is hosted on a specific worker. */
  public trackRoomOnWorker(roomId: string, workerPid: number): void {
    this.roomWorkerMap.set(roomId, workerPid);
  }

  /** Remove the room-to-worker mapping when a room is closed. */
  public untrackRoom(roomId: string): void {
    this.roomWorkerMap.delete(roomId);
  }

  // ── Health / observability ─────────────────────────────────────────────────

  public getHealthStatus(): WorkerStats[] {
    return this.workers.map(w => ({
      pid:         w.worker.pid!,
      healthy:     w.healthy,
      routerCount: w.routerCount,
    }));
  }

  public hasHealthyWorkers(): boolean {
    return this.workers.some(w => w.healthy);
  }

  public getWorkerCount(): number {
    return this.workers.length;
  }

  public getHealthyWorkerCount(): number {
    return this.workers.filter(w => w.healthy).length;
  }

  /**
   * Collect mediasoup worker resource usage stats.
   * getResourceUsage() requires mediasoup ≥ 3.12 with uv_rusage support.
   */
  public async getWorkerStats(): Promise<WorkerStats[]> {
    const results: WorkerStats[] = [];

    for (const info of this.workers) {
      const stat: WorkerStats = {
        pid:         info.worker.pid!,
        healthy:     info.healthy,
        routerCount: info.routerCount,
      };

      try {
        const usage = await info.worker.getResourceUsage();
        stat.cpuUsage    = usage.ru_utime;  // microseconds of user CPU time
        stat.memoryUsage = usage.ru_maxrss; // max RSS in bytes
      } catch {
        // Non-critical — getResourceUsage may not be available on all platforms
      }

      results.push(stat);
    }

    return results;
  }

  // ── Shutdown ───────────────────────────────────────────────────────────────

  public async shutdown(): Promise<void> {
    logger.info('Shutting down all mediasoup workers...');

    for (const { worker } of this.workers) {
      try {
        worker.close();
      } catch (err) {
        logger.warn('Error closing mediasoup worker during shutdown', {
          pid: worker.pid,
          err,
        });
      }
    }

    this.workers = [];
    this.roomWorkerMap.clear();
    logger.info('All mediasoup workers closed.');
  }
}

export const workerManager = new WorkerManager();
