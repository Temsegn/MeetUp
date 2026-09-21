# MeetSpace Authentication — API Contract

Base URL: `{API_URL}/auth` (default dev: `http://localhost:4001/auth`)

All endpoints accept and return `application/json`. Requests must include
`credentials: 'include'` (browser) so the refresh cookie is sent and stored.

## Authentication model

| Token | Storage | Lifetime | Transport |
| --- | --- | --- | --- |
| Access token (JWT) | Client memory only — **never** localStorage | 15 min (`ACCESS_TOKEN_TTL_SECONDS`) | `Authorization: Bearer` header |
| Refresh token (opaque, 256-bit) | Server DB (SHA-256 hash only) | 12 h, or **7 days** with Remember Me | `ms_refresh` cookie: `HttpOnly; SameSite=Lax; Secure` (prod); `Path=/` |

- The refresh cookie is **rotated on every refresh** — each use issues a new token and invalidates the old one.
- Reusing a rotated-out token is treated as theft: the **entire session family is revoked** (`SESSION_REUSE_DETECTED`).
- Access-token lifetime is fully independent of Remember Me. Remember Me only extends the *refresh session* lifetime.
- Access tokens are rejected if they were issued before the user's last password change (millisecond-precision `iatMs` claim).

## Common error shape

```json
{ "error": "human readable message", "code": "MACHINE_CODE" }
```

Codes: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `INVALID_TOKEN` (401),
`AUTH_REQUIRED` (401), `PASSWORD_CHANGED` (401), `SESSION_REUSE_DETECTED` (401),
`SESSION_REVOKED` (401), `SESSION_EXPIRED` (401), `SESSION_INVALID` (401),
`SESSION_MISSING` (401), `RATE_LIMITED` (429), `LOGIN_LOCKED` (429),
`CONFLICT` (409), `INVALID_RESET_TOKEN` (400), `INVALID_VERIFICATION_TOKEN` (400),
`WEAK_PASSWORD` (400), `PASSWORD_REUSE` (400), `CURRENT_PASSWORD_INCORRECT` (400),
`NOT_FOUND` (404), `CSRF_ORIGIN` (403), `INTERNAL_ERROR` (500).

## User object (public shape)

```json
{
  "id": "6a814e639b1cfd3eb1f9b26a",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "avatarColor": "hsl(210, 60%, 50%)",
  "emailVerified": true,
  "createdAt": "2026-08-16T05:45:07.080Z"
}
```

## Tokens object

```json
{ "accessToken": "<jwt>", "expiresIn": 900 }
```

---

## Endpoints

### POST /auth/signup

Create an account; auto-logs-in and returns an access token + refresh cookie.
Sends a welcome email and a verification email (dev: printed to the backend log).

Request:
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "StrongPass123", "rememberMe": true }
```

- `password`: 10–128 chars, must contain lowercase, uppercase, and a digit.
- `rememberMe`: optional boolean, default `false`.

Response `201`:
```json
{ "user": { "...": "..." }, "tokens": { "accessToken": "...", "expiresIn": 900 } }
```
Sets `ms_refresh` cookie.

Errors: `VALIDATION_ERROR`, `WEAK_PASSWORD`, `CONFLICT` (duplicate email, race-safe via unique index).

### POST /auth/login

Request:
```json
{ "email": "jane@example.com", "password": "StrongPass123", "rememberMe": true }
```

Response `200`: same shape as signup, plus `ms_refresh` cookie.

Security behavior:
- Same generic `INVALID_CREDENTIALS` for wrong password **and** unknown email (no account enumeration).
- Per-(email, IP) lockout: after `LOGIN_MAX_FAILED_ATTEMPTS` (5) failures in 15 min → `429 LOGIN_LOCKED`. Lockout applies identically to existing and non-existing emails.
- Per-IP rate limit: `LOGIN_RATE_LIMIT_MAX` (10 / 15 min).

### POST /auth/refresh

No body. Requires the `ms_refresh` cookie.

Response `200`: `{ user, tokens }`. **Rotates** the cookie (new value returned via `Set-Cookie`).
The access token in the response body is the only token the client ever sees.

Errors: `SESSION_MISSING`, `SESSION_INVALID`, `SESSION_REVOKED`, `SESSION_EXPIRED`,
`SESSION_REUSE_DETECTED` (reuse → the whole session family is revoked).

### POST /auth/logout

No body. Revokes the session that owns the `ms_refresh` cookie and clears it.

Response `200`: `{ "success": true }`.

### POST /auth/logout-all

**Auth required** (Bearer). Revokes *every* session for the user, including the
current one, and clears the cookie.

Response `200`: `{ "success": true }`.

### POST /auth/forgot-password

Request: `{ "email": "jane@example.com" }`

Response `200` — **always the same**, whether or not the account exists:
```json
{ "message": "If an account exists for that email, a password reset link has been sent." }
```
When the account exists: a single-use reset token (30 min expiry, SHA-256 hash stored
at rest) is emailed; previously outstanding reset tokens for that user are invalidated.

Rate limit: 5–20 / 15 min per IP.

### POST /auth/reset-password

Request:
```json
{ "token": "<from email link>", "newPassword": "NewPass456", "confirmPassword": "NewPass456" }
```

- Validates token, expiry, single-use. Rejects reusing the current password.
- On success: password hash replaced, `passwordChangedAt` set, **all sessions revoked**, token consumed.

Response `200`: `{ "success": true }`.
Errors: `INVALID_RESET_TOKEN` (unknown/expired/used), `VALIDATION_ERROR`, `WEAK_PASSWORD`, `PASSWORD_REUSE`.

### POST /auth/change-password

**Auth required** (Bearer). Request:
```json
{ "currentPassword": "OldPass123", "newPassword": "NewPass456", "confirmPassword": "NewPass456" }
```

- Requires the current password; rejects reuse of the current password.
- Sets `passwordChangedAt` (invalidates all pre-change access tokens) and revokes **all other** sessions.
- The **current** session is intentionally kept, and the response includes a fresh access token
  (issued after the change, so it passes the `passwordChangedAt` check).

Response `200`: `{ "success": true, "tokens": { "accessToken": "...", "expiresIn": 900 } }`

Errors: `CURRENT_PASSWORD_INCORRECT`, `WEAK_PASSWORD`, `PASSWORD_REUSE`, `VALIDATION_ERROR`.

### GET /auth/verify-email?token=...

Consumes the single-use verification token (24 h expiry, hash stored at rest).
Idempotent when the email is already verified.

Response `200`: `{ "success": true, "user": { "...", "emailVerified": true } }`
Errors: `INVALID_VERIFICATION_TOKEN`, `TOKEN_REQUIRED`.

### POST /auth/resend-verification

**Auth required** (Bearer). Issues a fresh verification token (invalidating the old one) and emails it.

Response `200`: `{ "success": true, "alreadyVerified": boolean }`.

### GET /auth/me

**Auth required**. Response `200`: the user object (no password hash, no internal fields).

### GET /auth/sessions

**Auth required**. Response `200`:
```json
{
  "sessions": [
    {
      "id": "6a814e709b1cfd3eb1f9b274",
      "current": true,
      "rememberMe": true,
      "userAgent": "Mozilla/5.0 ...",
      "ip": "203.0.113.7",
      "createdAt": "...", "lastUsedAt": "...", "expiresAt": "..."
    }
  ],
  "currentSessionId": "6a814e709b1cfd3eb1f9b274"
}
```

### DELETE /auth/sessions/:sessionId

**Auth required**. Revokes the session *iff* it belongs to the caller (ownership enforced server-side).

Response `200`: `{ "success": true }`. Errors: `NOT_FOUND`.

---

## Rate limiting summary

| Endpoint | Limiter | Default |
| --- | --- | --- |
| All /auth | `authRateLimiter` | 20 / 15 min / IP |
| /auth/login | `loginRateLimiter` | 10 / 15 min / IP |
| /auth/forgot-password, /reset-password, /resend-verification | `tokenRequestLimiter` | 5–20 / 15 min / IP |
| login lockout | DB-backed per (email, IP) | 5 failures / 15 min → 429 |

> In-memory stores are single-process. Behind multiple replicas use a shared
> store (e.g. `rate-limit-mongo`) — see deployment notes in the audit doc.

## Cookies

```
Set-Cookie: ms_refresh=<token>; Max-Age=<remaining-session-ms>; Path=/;
            HttpOnly; SameSite=Lax; Secure  (Secure in production only)
```

- `HttpOnly` — JavaScript cannot read it (XSS cannot exfiltrate the refresh token).
- `SameSite=Lax` — blocks cross-site POST CSRF; still sent same-site (frontend → API).
- `Max-Age` tracks the *remaining* server-side session lifetime (rotations never extend it).
- Optional `COOKIE_DOMAIN` env for frontend/API on sibling subdomains.
