# MeetSpace Authentication — Security & Architecture Audit

This document is the audit required by the implementation spec (§13). It
covers architecture review, the threat-model matrix, verified behavior, and
an honest list of known weaknesses, races, and accepted trade-offs.

Audit date: 2026-08-16. State: implementation complete; 117/117 backend
tests passing; backend + frontend typechecks clean; full lifecycle verified
against a live server + MongoDB.

---

## 1. Architecture review

Layering (strict, no business logic in controllers):

```
routes (auth.routes.ts)
  → middleware (validate / authenticate / optional-auth / rate-limit / csrf)
  → controllers (thin HTTP adapters, one per feature)
  → services (business logic, one per feature, factory + DI)
  → repository (auth.repository.ts — single data-access facade, plain records)
  → models (Mongoose: User, RefreshSession, PasswordResetToken,
            EmailVerificationToken, LoginAttempt, AuditLog)
```

- **Dependency injection**: every service is `createXService(deps: AuthDeps = authRepository)`.
  Tests inject in-memory stubs; nothing in a service touches Mongoose directly.
  Repository returns plain records, never Mongoose documents.
- **Barrels**: `auth.controller.ts`, `auth.service.ts`, `auth.validation.ts`,
  `auth.middleware.ts` re-export so consumers import one path.
- **Compatibility**: `auth.middleware.ts` keeps the `authenticate` /
  `AuthRequest` exports used by `meetings` / `recordings` / socket auth.
- **Separation**: token/session management (`token.service`, `session.service`),
  password management (`password.service`), email (`email.service` + templates),
  audit (`audit.service`), validation (`validators/`), security primitives
  (`security/`), constants/types.
- **Scoring**: every controller → service → repository hop is one async call
  deep; no cycles between services.

## 2. Threat model / mitigation matrix

| Attack (§8) | Mitigation | Verified |
| --- | --- | --- |
| Brute-force login | IP rate limit (10/15 min) + DB-backed per-(email, IP) lockout (5 failures/15 min → 429) | e2e: attempts 1–5 → 401, attempt 6 → 429 |
| Credential stuffing | Same as above; lockout keyed to email+IP; `LOGIN_RATE_LIMIT_MAX` default 10/15 min/IP | e2e |
| Account enumeration | Generic `INVALID_CREDENTIALS` for wrong-password and unknown-email; lockout identical for both; forgot-password returns identical generic response; reset/verify tokens reject with the same message for unknown/expired/used | unit + e2e |
| Password-reset token theft | 256-bit CSPRNG token; SHA-256 hash at rest; 30-min expiry; single-use; one active link per account; new request invalidates old | unit |
| Token replay | Refresh tokens rotated on every use; previous hash retained; replay → family revoked | unit + e2e (old cookie replay → SESSION_REUSE_DETECTED) |
| Refresh-token reuse | Same as replay: `previousTokenHash` detection revokes the whole `familyId` | unit + e2e |
| CSRF | Refresh cookie `SameSite=Lax`; Origin check middleware; CORS allowlist rejects foreign origins (403); JSON-only content type | e2e |
| XSS token theft | Access token in memory only (never localStorage); refresh token HttpOnly; no user HTML rendered unescaped (email templates escape) | code review |
| Session fixation | New session id (`familyId` + `tokenHash`) minted on every login; refresh cookie value replaced on rotation | code review |
| Weak passwords | Zod + service assertion: 10–128 chars, lower + upper + digit; `WEAK_PASSWORD` at signup, reset, change | unit + e2e |
| Duplicate / invalid verification tokens | Unique tokenHash index; single-use; 24-h expiry; idempotent re-verify | unit + e2e |
| Same-password reuse | `isSamePassword` check on change + reset | unit |
| Password-change session survival | `passwordChangedAt` + millisecond `iatMs` claim rejects every pre-change access token (HTTP + Socket.IO); other refresh sessions revoked | unit + e2e |
| Stale refresh session | MongoDB TTL index on `expiresAt` deletes expired sessions automatically | code review |

## 3. Cryptographic primitives

- **Passwords**: bcrypt, cost 12 (env `BCRYPT_ROUNDS`; 13–14 on dedicated hardware).
- **Tokens**: `crypto.randomBytes(32)` → 256-bit base64url; infeasible to guess.
- **Hashing at rest**: SHA-256 is appropriate for high-entropy random tokens
  (unlike human-chosen passwords); used for refresh, reset, and verification tokens.
- **Comparison**: bcrypt.compare (constant-time derived-key comparison);
  `timingSafeEqual` helper included for hash equality.

## 4. Token lifecycle

| Lifecycle property | Behavior |
| --- | --- |
| Access token TTL | 15 min (`ACCESS_TOKEN_TTL_SECONDS`) — independent of Remember Me |
| Refresh session TTL | 12 h default; **7 days** with Remember Me (`REMEMBER_ME_TTL_SECONDS`) |
| Rotation | Every refresh mints a new opaque token; absolute expiry never extended |
| Expiry | Session `expiresAt` fixed at creation; TTL index sweeps expired rows |
| Revocation | logout (one), logout-all (all), password change (others), password reset (all), user revoke (one), reuse (family) |
| Access-token revocation | Not instant (stateless JWT) — bounded by 15-min TTL; password changes invalidate immediately via `iatMs` |

## 5. Known weaknesses, races, and accepted trade-offs

These are documented, deliberate decisions or residual risks. Each includes
the reason and, where cheap, a hardening path.

### 5.1 Concurrent refresh from two tabs can look like reuse (TOCTOU race)
Two browser tabs share the same refresh cookie. If both refresh near-simultaneously,
one rotation wins; the loser's cookie becomes `previousTokenHash`, so the loser's
*next* refresh is classified as reuse and revokes the whole family → forced re-login.
- *Severity*: low (no security breach — an attacker gains nothing; the legitimate
  user is inconvenienced). Frontend dedupes in-flight refreshes within a tab.
- *Hardening*: keep a short grace window (e.g. 30–60 s) during which a
  `previousTokenHash` match rotates instead of revoking; or store the last N
  hashes per family. Revocation on reuse remains correct for genuine theft.

### 5.2 Reuse detection covers only the immediately-rotated-out token
If an attacker replays a token that was rotated *twice* ago, it is dead (its hash
is gone) but no family revocation fires. The attacker cannot authenticate; the
only loss is forensic signal.
- *Hardening*: retain a bounded ring of recent hashes per session.

### 5.3 Access tokens are not instantly revoked by logout
Stateless JWTs survive until expiry (≤15 min) after a logout-all. This is the
standard trade-off of stateless access tokens.
- *Hardening*: session-scoped token blacklist or per-request session check if
  instant revocation becomes a product requirement (adds a DB read per request).

### 5.4 Login timing side channel
`bcrypt.compare` runs only when the account exists, so a network attacker could
in principle distinguish known from unknown emails by response timing. Generic
messages already block the trivial vector.
- *Hardening*: always compare against a dummy hash when the account is unknown
  (`bcrypt.compare(password, DUMMY_HASH)`), equalizing timing.

### 5.5 Signup reveals registration status (409)
`POST /signup` returns 409 for an existing email. This is a deliberate UX
trade-off — the legitimate owner must be told why registration failed. SameSite
cookies and rate limits bound abuse; if enumeration is a hard requirement, make
signup always-200 and require email confirmation before the account activates.

### 5.6 Email verification is not required to log in
Unverified accounts can sign in and join meetings (a banner encourages
verification). Enabling verification-only access is a product decision; the
plumbing (`emailVerifiedAt`, `GET /verify-email`) is already in place.

### 5.7 Rate-limit store is in-memory (single-process)
`express-rate-limit` defaults to an in-memory store. Horizontal scaling requires
a shared store (`rate-limit-mongo` / Redis). The per-(email, IP) login lockout
is DB-backed and already scales.

### 5.8 Lockout is per (email + IP)
A distributed attacker with many IPs can keep guessing one account.
- *Hardening*: optional global per-email failure counter (with careful
  enumeration analysis — keep the response identical for locked accounts that
  exist and those that don't).

### 5.9 CORS rejection was historically a 500
Foreign `Origin` headers were rejected by the CORS middleware, which surfaced as
500. Fixed: `errorHandler` now maps `CORS:` errors to `403 CSRF_ORIGIN`
(commit in this change). Browser requests are blocked either way.

### 5.10 Email-change flow not implemented
The spec lists "email-change/session security handling" (§7). There is no
`change-email` endpoint yet. When added: verify the new address with a fresh
token, revoke sessions on success, and keep audit events — the existing token
plumbing supports this directly.

### 5.11 TTL cleanup granularity
MongoDB's TTL monitor runs ~every 60 s; expired sessions/tokens may linger in
the DB for up to a minute. They are still rejected by the service (expiry is
checked in code) — this is only storage hygiene.

### 5.12 Password policy is character-class based
Reasonable default (10+ chars, upper/lower/digit), but no breach-password
denylist. For production, add a check against a known-breached-password list
(HIBP k-anonymity API or a local list).

## 6. Environment / deployment checklist

- `JWT_SECRET` ≥ 32 chars, random (`crypto.randomBytes(64).toString('hex')`).
- `CORS_ORIGINS` explicit (no `*` in production — enforced at boot).
- `FRONTEND_URL` set to the public origin (email links).
- `SMTP_*` configured, or accept console delivery (dev only).
- HTTPS termination at the reverse proxy → `Secure` cookies are set.
- Optional `COOKIE_DOMAIN` for sibling subdomains.
- Shared rate-limit store before scaling beyond one instance.
- New-relic-style monitoring on `AuditLog` writes (they are fire-and-forget;
  failures are logged, never fatal).

## 7. Test coverage map

| Area | File | Covers |
| --- | --- | --- |
| Registration | `signup.test.ts` | hashing, normalization, duplicates, weak passwords, auto-login, verification token |
| Login | `login.test.ts` | success, generic errors, lockout, enumeration parity, remember-me lifetimes |
| Refresh | `refresh.test.ts` | rotation, reuse detection, expiry, revocation, no-expiry-extension |
| Logout | `logout.test.ts` | single-session revoke, logout-all, no-op on unknown token |
| Forgot password | `forgot-password.test.ts` | generic response, hashed storage, single active link |
| Reset password | `reset-password.test.ts` | consumption, single-use, expiry, session revocation, reuse rejection |
| Change password | `change-password.test.ts` | current-password check, reuse/weak rejection, session revocation, token invalidation |
| Email verification | `email-verification.test.ts` | issue, verify, invalid/expired/used, idempotency |
| Sessions | `session.test.ts` | list, ordering, ownership-scoped revocation, device metadata |

Run: `npm run test:auth` (unit), `npm test` (full suite).
