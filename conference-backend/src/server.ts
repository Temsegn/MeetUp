import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env, corsOrigins } from './config/env';
import { connectDB, disconnectDB } from './database/db';
import { mediaEngine } from './media/mediasoup/media-engine';
import { setupSocketServer } from './realtime/socket.server';
import { logger } from './infrastructure/logging/logger';

let isShuttingDown = false;

const startServer = async () => {
  const app    = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin:      corsOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // Ping/pong detects stale connections; tune to your expected network latency
    pingTimeout:  20_000,
    pingInterval: 25_000,
  });

  // Connect to MongoDB
  await connectDB();

  // Initialize MediaEngine (workers, router/transport wiring, stats collection)
  await mediaEngine.initialize(io);

  // Setup Socket.IO handlers
  setupSocketServer(io);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`, {
      env:     env.NODE_ENV,
      port:    env.PORT,
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal} — starting graceful shutdown`);

    // 1. Stop accepting new HTTP/WS connections
    server.close(() => logger.info('HTTP server closed'));

    // 2. Notify all connected clients before dropping connections
    io.emit('worker-died', { message: 'Server is restarting — please rejoin.' });

    // 3. Close all Socket.IO connections
    io.close(() => logger.info('Socket.IO server closed'));

    // 4. Brief pause for in-flight messages to drain
    await new Promise(r => setTimeout(r, 2_000));

    // 5. Shutdown media engine (routers → workers)
    await mediaEngine.shutdown();

    // 6. Disconnect database
    await disconnectDB();

    logger.info('Graceful shutdown complete — exiting');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: err.message, stack: err.stack });
    if (!isShuttingDown) gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server', { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
