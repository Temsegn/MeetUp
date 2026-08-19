import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, corsOrigins } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { meetingsRouter } from './modules/meetings/meetings.routes';
import { recordingsRouter } from './modules/recordings/recordings.routes';
import { logger } from './infrastructure/logging/logger';
import { metrics } from './infrastructure/metrics/metrics.service';
import { errorHandler } from './shared/middleware/error-handler';
import { workerManager } from './media/managers/worker-manager';
import { mediaEngine } from './media/media-engine';
import { isMongoConnected } from './database/db';

export const createApp = (): Express => {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }));

  // ── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  // Required for reading the HttpOnly refresh cookie in auth routes.
  app.use(cookieParser());

  // ── Global rate limit ──────────────────────────────────────────────────────
  // const globalLimiter = rateLimit({
  //   windowMs:       env.RATE_LIMIT_WINDOW_MS,
  //   max:            env.RATE_LIMIT_MAX,
  //   standardHeaders: true,
  //   legacyHeaders:  false,
  //   message: { error: 'Too many requests — please try again later.' },
  // });
  // app.use(globalLimiter);

  // const authLimiter = rateLimit({
  //   windowMs:       15 * 60 * 1000,
  //   max:            env.AUTH_RATE_LIMIT_MAX,
  //   standardHeaders: true,
  //   legacyHeaders:  false,
  //   message: { error: 'Too many auth attempts — please try again later.' },
  // });

  // ── Health endpoints ───────────────────────────────────────────────────────

  /** Liveness — always 200 if process is alive */
  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  /** Readiness — checks MongoDB + mediasoup workers */
  app.get('/health/ready', (_req, res) => {
    const mongoOk = isMongoConnected();
    const workersOk = workerManager.hasHealthyWorkers();
    const workerInfo = workerManager.getHealthStatus();
    const ready = mongoOk && workersOk;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: {
        mongodb: mongoOk ? 'ok' : 'error',
        workers: workersOk ? 'ok' : 'error',
      },
      workers: workerInfo,
      metrics: metrics.toJSON(),
      timestamp: new Date().toISOString(),
    });
  });

  /** Prometheus metrics scrape endpoint */
  app.get('/metrics', (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.toPrometheusText());
  });

  // ── Media observability endpoints ─────────────────────────────────────────

  /**
   * GET /media/stats
   * Returns per-room stats: participant count, transport/producer/consumer counts,
   * worker PID, and room age.
   * Useful for capacity planning and load monitoring.
   */
  app.get('/media/stats', async (_req, res) => {
    try {
      const [roomStats, workerStats] = await Promise.all([
        Promise.resolve(mediaEngine.getRoomStats()),
        mediaEngine.getWorkerStats(),
      ]);

      res.json({
        rooms: roomStats,
        workers: workerStats,
        summary: {
          activeRooms: metrics.activeRooms.get(),
          activeParticipants: metrics.activeParticipants.get(),
          activeProducers: metrics.activeProducers.get(),
          activeConsumers: metrics.activeConsumers.get(),
          activeTransports: metrics.activeTransports.get(),
          activeWorkers: metrics.activeWorkers.get(),
          iceDisconnects: metrics.iceDisconnects.get(),
          iceFailures: metrics.iceFailures.get(),
          dtlsFailures: metrics.dtlsFailures.get(),
          workerDeaths: metrics.workerDeaths.get(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('GET /media/stats error', { err: msg });
      res.status(500).json({ error: msg });
    }
  });

  /**
   * GET /media/diagnostics/:roomId/:participantId
   * Returns full media state for a single peer:
   *   transport ICE/DTLS state + bitrate, all producers, all consumers with layers.
   * Intended for operator debugging — not exposed publicly in production.
   */
  app.get('/media/diagnostics/:roomId/:participantId', async (req: Request, res: Response) => {
    const roomId = String(req.params['roomId'] ?? '');
    const participantId = String(req.params['participantId'] ?? '');
    try {
      const state = await mediaEngine.getPeerDiagnostics(roomId, participantId);
      if (!state) {
        return res.status(404).json({ error: 'Peer not found' });
      }
      res.json(state);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('GET /media/diagnostics error', { err: msg });
      res.status(500).json({ error: msg });
    }
  });

  // ── Application routes ─────────────────────────────────────────────────────
  app.use('/auth', authRouter);
  app.use('/meetings', meetingsRouter);
  app.use('/recordings', recordingsRouter);

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};
