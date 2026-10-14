# Meeting calendar invitations

## What was wrong

1. Without `SMTP_HOST`, nodemailer logged invites to the console and returned `delivered: false` without failing the create API.
2. Meeting invites were fire-and-forget (`void send…`) with errors only in logs — the UI always looked successful.
3. Teammates received in-app notifications only (no email).
4. Emails were HTML join links only — no RFC 5545 `.ics` / `METHOD:REQUEST`, so Gmail/Outlook did not show Accept.
5. Reschedule and cancel did not send calendar updates.
6. No IANA timezone was stored on the meeting.

## How it works now

1. Meeting is persisted first (`POST /workspace-meetings`).
2. `MeetingInviteDelivery` outbox rows are created (idempotent key: meeting + email + kind + sequence).
3. Each recipient gets HTML + `text/calendar` + `.ics` attachment when SMTP is configured.
4. Create/patch/cancel/add-invite responses include `invitations: { sent, failed, pending, smtpConfigured, deliveries }`.
5. Reschedule bumps `calendarSequence` and sends `METHOD:REQUEST` with the same `calendarUid`.
6. Cancel sends `METHOD:CANCEL` with the same UID.
7. `POST /workspace-meetings/:id/invitations/retry` retries failed/pending rows without duplicating accepted ones.
8. Background job every 30s sweeps pending/failed deliveries with backoff.

## SMTP configuration

Set in `server/.env` (see `server/.env.example`):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Samtal <your@gmail.com>
FRONTEND_URL=https://meet.samtal.cc
```

- Gmail requires a Google **App Password** (2-Step Verification on).
- `FRONTEND_URL` must be the public MeetUp origin so join links in email/ICS are correct.
- If `SMTP_HOST` is unset, meetings still save; invitation status shows failed with a console-only message.

## Deploy (Docker)

```bash
# From repo root, after setting server/.env SMTP_* and FRONTEND_URL
docker compose up -d --build server client
docker compose logs -f server | grep -E 'Email sent|Email send failed|dev email transport'
```

Look for `Email sent` with a `messageId`. If you see `dev email transport`, SMTP is not configured in the container env.

## Manual checklist

1. Schedule a meeting with a guest email you control; confirm the meeting appears on Meeting detail.
2. With SMTP configured, open the inbox: Accept in Gmail / Outlook web; confirm join URL and time.
3. Click **Add to Google Calendar** — confirm the prefilled event (you must save it).
4. Click **Add to Outlook** — confirm the compose page.
5. **Download .ics** and import into desktop Outlook / Apple Calendar.
6. **Edit** time on the detail page — recipient should get an update for the **same** event (not a duplicate).
7. **Cancel** — recipient calendar should cancel/remove the event.
8. Stop SMTP / use wrong password — meeting still saves; detail shows failed; **Retry failed** recovers after fixing SMTP.

## API extras

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/workspace-meetings/:id/calendar.ics` | Download ICS |
| POST | `/workspace-meetings/:id/invitations/retry` | Retry failed deliveries |

Google Calendar API / Microsoft Graph OAuth are intentionally out of scope.
