import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4001').transform((val) => parseInt(val, 10)),

  // CORS — comma-separated list of allowed origins.
  // In production, must be explicit (no wildcard).
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/meetspace'),

  // In production, JWT_SECRET MUST be set explicitly — no default.
  JWT_SECRET: z.string().min(32),

  // ── Authentication ────────────────────────────────────────────────────────
  // Access token (JWT) lifetime — kept short; refresh tokens restore it.
  ACCESS_TOKEN_TTL_SECONDS: z.string().default('900').transform(Number), // 15 min
  // Refresh session lifetime when Remember Me is NOT checked.
  REFRESH_SESSION_TTL_SECONDS: z.string().default('43200').transform(Number), // 12 h
  // Refresh session lifetime when Remember Me IS checked.
  REMEMBER_ME_TTL_SECONDS: z.string().default('604800').transform(Number), // 7 days
  // Password-reset token lifetime.
  PASSWORD_RESET_TOKEN_TTL_SECONDS: z.string().default('1800').transform(Number), // 30 min
  // Email-verification token lifetime.
  EMAIL_VERIFICATION_TOKEN_TTL_SECONDS: z.string().default('86400').transform(Number), // 24 h
  // Login lockout: max failed attempts per (email + IP) window.
  LOGIN_MAX_FAILED_ATTEMPTS: z.string().default('5').transform(Number),
  LOGIN_LOCKOUT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 min

  // Frontend base URL used to build verification / reset links.
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Optional cookie domain (e.g. '.example.com') for cross-subdomain auth.
  COOKIE_DOMAIN: z.string().optional(),

  // ── Email (SMTP) — optional. When unset, emails are logged to the console
  //    (development mode) so flows remain testable without a mail server.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  SMTP_SECURE: z.string().optional().transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('MeetSpace <no-reply@meetspace.local>'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX:       z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX:  z.string().default('20').transform(Number),
  LOGIN_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Mediasoup
  MEDIASOUP_WORKERS:   z.string().default('0').transform((v) => {
    const n = parseInt(v, 10);
    return n > 0 ? n : require('os').cpus().length;
  }),
  MEDIASOUP_MIN_PORT:      z.string().default('40000').transform(Number),
  MEDIASOUP_MAX_PORT:      z.string().default('49999').transform(Number),
  MEDIASOUP_LISTEN_IP:     z.string().default('0.0.0.0'),
  MEDIASOUP_ANNOUNCED_IP:  z.string().optional(),

  // TURN server (optional, highly recommended for production)
  TURN_URL:      z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_PASSWORD: z.string().optional(),

  // File storage — recordings, photos, other files
  // Layout: {STORAGE_DIR}/recordings|photos|files/...
  STORAGE_DIR: z.string().optional(),
  // Optional override for recordings only (legacy). Default: {STORAGE_DIR}/recordings
  RECORDINGS_DIR: z.string().optional(),
  RECORDING_FFMPEG_PATH: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // ── Bcrypt cost factor (scrypt-style work factor for password hashing) ─────
  // 12 is a strong default; raise to 13-14 on dedicated hardware.
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

const data = parseResult.data;

// In production, reject wildcard CORS explicitly
if (data.NODE_ENV === 'production') {
  const origins = data.CORS_ORIGINS.split(',').map(o => o.trim());
  if (origins.includes('*')) {
    console.error('❌ CORS_ORIGINS cannot be "*" in production. Set explicit origins.');
    process.exit(1);
  }
}

export const env = data;

/** Parsed CORS origins as an array */
export const corsOrigins = data.CORS_ORIGINS.split(',').map(o => o.trim());
