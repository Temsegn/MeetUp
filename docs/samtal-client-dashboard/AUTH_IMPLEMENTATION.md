# Authentication Module — Design Inventory & Implementation

**Figma:** [Samtal-meet-UI (Copy)](https://www.figma.com/design/mD2BeG8wud1vn4V4adThBe/Samtal-meet-UI--Copy-) · `mD2BeG8wud1vn4V4adThBe`  
**Scope:** Auth UI + wiring to existing backend. Backend auth module already production-complete — reused, not duplicated.

---

## 1. AUTH SCREEN INVENTORY

| # | Screen | Figma page | Frame | Node ID | Status |
|---|--------|------------|-------|---------|--------|
| 1 | Sign In | Page 1 | Container | `16:678` | In Figma |
| 2 | Sign Up | Page 1 | Sign up — Samtal \| Create your account | `16:955` | In Figma |
| 3 | Forgot Password | Page 1 | Forgot Password — Samtal | `16:871` | In Figma |
| 4 | Reset Password | — | — | — | **NOT FOUND IN FIGMA** |
| 5 | Email Verification | — | — | — | **NOT FOUND IN FIGMA** |
| 6 | Auth error/success/loading artboards | — | — | — | **NOT FOUND IN FIGMA** (inferred) |
| 7 | Auth modals/dialogs | — | — | — | **NOT FOUND IN FIGMA** |

---

## 2. Routes

| Screen | Route |
|--------|-------|
| Sign In | `/auth` |
| Sign Up | `/auth/sign-up` |
| Forgot Password | `/auth/forgot-password` |
| Reset Password | `/auth/reset-password?token=` |
| Verify Email | `/auth/verify-email?token=` |

---

## 3. Exact text (from live Figma MCP → `AUTH_COPY`)

### Sign In (`16:678`) — Plus Jakarta Sans, primary `#0056ef`
- Welcome back 👋 / Sign in to your account to continue
- Email address / Enter your email · Password / Enter your password
- Remember me · Forgot password? · Sign in
- or continue with · Continue with Google · Continue with Microsoft
- Don't have an account? · Sign up
- Promo: Work smarter / Stay organized / Collaborate seamlessly
- Footer: © 2025 Samtal. All rights reserved. · Privacy Policy · Terms of Service

### Sign Up (`16:955`) — Manrope in Figma, primary `#2165ec`
- Create your account
- Start your journey with Samtal and experience **smarter** collaboration.
- First name / Last name / **Work email** / Password / Confirm password / **Company name** / **Team size**
- Password hint (exact Figma): Must be at least 8 characters with a number and a special character.
- I agree to the Terms of Service and Privacy Policy (linked)
- Create Account · or sign up with · Sign up with Google · Sign up with Microsoft
- Already have an account? Sign in
- Features: All-in-one platform / Secure & reliable / Insights that matter

### Forgot Password (`16:871`) — SF Pro in Figma, primary `#195ee6`
- Forgot Password? · No worries! Enter your email…
- Email address / Enter your email address · Send Reset Link · Back to Sign In
- Tips: Secure & safe / Quick recovery / Need help?

### Reset / Verify
- Product-inferred copy (not in Figma). Styled with auth tokens.

---

## 4. Assets (downloaded to `public/auth/`)

| Asset | File | Source node |
|-------|------|-------------|
| Email / lock / eye / sign-in icons | `icon-*.svg` | `16:678` |
| Google / Microsoft | `icon-google.svg`, `icon-microsoft.svg` | `16:678` |
| Feature icons + chart | `icon-feature-*.svg`, `icon-chart.svg` | `16:678` |
| Promo rail mark | `promo-mark.png` | `16:678` |
| Forgot illustration + tip icons | `forgot-*.png/svg` | `16:871` |
| App logo | `/samtal-logo-blue.png` | Repo (Figma logo crop also saved as `logo-crop.png`) |
| Eye-off (hide password) | Inline SVG | **Not a separate Figma export on Sign In** |
| Sign-up user/building icons | Stroke SVG fallback | Sign-up icon URLs not re-downloaded (layout uses shared email/lock where applicable) |

---

## 5. Design tokens

| Token | Sign In | Sign Up | Forgot |
|-------|---------|---------|--------|
| Primary | `#0056ef` | `#2165ec` | `#195ee6` |
| Text | `#1c2842` | `#161e35` | `#0a182d` |
| Muted | `#62748e` | rgba(22,30,53,.7) | `#6e7b8e` |
| Border | `#e2e8f0` | `#d5dfeb` | `#e0e7ef` / `#d9e0ea` |
| Promo BG | `#f1f6fd` | `#f8fafd` page | `#f1f7fd` |
| Input H | 62.5px | ~59px | ~48px |
| Radius | ~18px | ~7px | ~9–15px |
| Font | Plus Jakarta | Manrope (loaded) | SF Pro → Plus Jakarta (**discrepancy**) |

---

## 6. Frontend architecture

```
conference-frontend/src/features/auth/
  components/   AuthLayout, AuthField, AuthError, SocialAuthButtons
  pages/        SignIn, SignUp, ForgotPassword, ResetPassword, VerifyEmail
  hooks/        useSignIn, useSignUp, useForgotPassword, useResetPassword, useVerifyEmail
  schemas/      auth.schemas (+ .test.mjs)
  constants/    AUTH_COPY, AUTH_TOKENS, AUTH_ASSETS
  styles/       auth.css
  index.ts
services/auth/auth.service.ts   ← existing HTTP client (reuse)
contexts/AuthContext.tsx        ← existing session state (reuse)
```

---

## 7. Backend (reuse — no new modules)

```
POST /auth/signup | /auth/login | /auth/logout | /auth/refresh
POST /auth/forgot-password | /auth/reset-password
GET  /auth/verify-email?token= | POST /auth/resend-verification | GET /auth/me
```

Signup body: `{ name, email, password, rememberMe? }`  
**Company / team size:** UI-only until API supports them (`name = first + last`).  
**OAuth:** UI only — API CONTRACT TO BE DEFINED.  
Errors: `{ error: string, code?: string }`

---

## 8. Security

Existing backend: bcrypt, in-memory access JWT, HttpOnly refresh cookie, hashed reset/verify tokens, rate limits, CSRF. Frontend never stores access token in localStorage.

**Password policy note:** Figma Sign Up hint says 8+ with number + special character. Backend requires **10+ with upper, lower, and number**. Client validates against **backend** rules; Figma hint text is shown verbatim.

---

## 9. Environment

Backend: see `conference-backend/.env.example` (JWT_SECRET, FRONTEND_URL, SMTP_*, AUTH rate limits).  
Frontend: `conference-frontend/.env.example` → `VITE_API_URL=http://localhost:4001`

---

## 10. Testing

```bash
cd conference-frontend && npm run test:auth
```

Backend: `conference-backend/src/modules/auth/tests/`

---

## 11. Figma → code comparison

| Check | Sign In | Sign Up | Forgot | Reset/Verify |
|-------|---------|---------|--------|--------------|
| Exact copy | Match | Match (after MCP refresh) | Match | N/A |
| Layout | Form L / promo R | Promo L / form R | Card L / illustration R | Solo card |
| Primary color | `#0056ef` | `#2165ec` | `#195ee6` | Auth tokens |
| Font | Plus Jakarta | Manrope | Plus Jakarta (**Figma SF Pro**) | Plus Jakarta |
| Icons from Figma | Yes (`public/auth`) | Partial (shared + fallbacks) | Yes | N/A |
| Password hint vs API | N/A | **Discrepancy documented** | N/A | Backend policy text |
| Social OAuth | UI only | UI only | N/A | N/A |
| Loading/error frames | Inferred alerts | Same | Same | Same |

### Remaining gaps
1. SF Pro not used on Forgot (web licensing) — Plus Jakarta substituted.
2. Sign-up field icons not all re-exported from `16:955` (user/building fallbacks).
3. Promo dashboard floating overlays on Sign In simplified vs Figma absolute decorations.
4. Reset & Verify have no Figma source.
5. Company / team size / OAuth not persisted by API.

---

## 12. Status

- [x] Figma inventory + live MCP re-check (`16:678`, `16:955`, `16:871`)
- [x] Feature module UI wired to existing auth API
- [x] Routes: `/auth`, `/auth/sign-up`, forgot, reset, verify
- [x] Assets downloaded under `public/auth/`
- [x] Docs + client validation tests
- [ ] OAuth / company / team size API (blocked)
