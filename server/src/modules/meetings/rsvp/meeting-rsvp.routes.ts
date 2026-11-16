import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getRsvp, setRsvp } from './meeting-rsvp.service';

/**
 * Public RSVP endpoints — authorised by the signed token in the URL
 * (invitees may not have an account). Mounted at /meetings/rsvp.
 */
const router = Router();

const rsvpLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});

router.use(rsvpLimiter);

router.get('/:token', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await getRsvp(String(req.params.token)));
});

router.post('/:token', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await setRsvp(String(req.params.token), (req.body as { response?: unknown })?.response));
});

export { router as meetingRsvpRouter };
