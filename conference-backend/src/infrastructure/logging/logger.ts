import winston from 'winston';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_DEV = process.env.NODE_ENV !== 'production';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: IS_DEV ? devFormat : prodFormat,
  defaultMeta: { service: 'conference-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Create a child logger with pre-bound context fields.
 * Usage:
 *   const log = createContextLogger({ roomId, socketId });
 *   log.info('peer joined');
 */
export function createContextLogger(context: Record<string, string | undefined>) {
  return logger.child(context);
}
