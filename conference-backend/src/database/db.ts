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

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
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
    // _connected set via 'connected' event above
  } catch (error: any) {
    logger.error('MongoDB initial connection failed', { err: error.message });
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
};
