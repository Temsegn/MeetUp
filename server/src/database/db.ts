import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../infrastructure/logging/logger';

let _connected = false;

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export const connectDB = async (): Promise<void> => {
  if (_connected) return;

  mongoose.connection.on('connected', () => {
    _connected = true;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    _connected = false;
    logger.warn('MongoDB disconnected — will auto-reconnect');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { err: err.message });
  });

  mongoose.connection.on('reconnected', () => {
    _connected = true;
    logger.info('MongoDB reconnected');
  });

  const maxAttempts = 8;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15_000,
        socketTimeoutMS: 45_000,
        // Prefer IPv4 — Docker + Atlas SRV often fails on broken IPv6 paths.
        family: 4,
      });
      lastErr = null;
      break;
    } catch (error: unknown) {
      lastErr = error;
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('MongoDB initial connection failed', {
        err: msg,
        attempt,
        maxAttempts,
      });
      if (attempt < maxAttempts) {
        const delayMs = Math.min(30_000, 1_500 * 2 ** (attempt - 1));
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  if (lastErr) {
    logger.error('MongoDB unavailable after retries — exiting so Docker can restart', {
      err: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
    process.exit(1);
  }

  // Repair legacy unique googleId index that treated null as a value (breaks local invites).
  try {
    const users = mongoose.connection.collection('users');
    const indexes = await users.indexes();
    const bad = indexes.find(
      (idx) =>
        idx.name === 'googleId_1' &&
        idx.unique === true &&
        idx.sparse !== true,
    );
    if (bad?.name) {
      await users.dropIndex(bad.name);
      logger.warn('Dropped non-sparse googleId unique index');
    }
    await users.updateMany({ googleId: null }, { $unset: { googleId: '' } });
    await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
  } catch (idxErr) {
    logger.warn('googleId index repair skipped', {
      err: idxErr instanceof Error ? idxErr.message : String(idxErr),
    });
  }
  try {
    const { migrateOwnerRolesToAdmin } = await import(
      '../modules/workspace/org.bootstrap'
    );
    await migrateOwnerRolesToAdmin();
  } catch (migErr) {
    logger.warn('Owner→Admin role migration skipped', {
      err: migErr instanceof Error ? migErr.message : String(migErr),
    });
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
};
