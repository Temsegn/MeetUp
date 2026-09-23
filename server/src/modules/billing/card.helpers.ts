import { ValidationError } from '../../shared/errors/AppError';
import type { CardBrand } from '../../database/models/PaymentMethod.model';

export type CardInput = {
  holderName: string;
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
};

/** Stripe-style test PAN that always declines. Never stored. */
const DECLINE_PAN = '4000000000000002';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function luhnValid(pan: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = pan.length - 1; i >= 0; i -= 1) {
    let n = Number(pan[i]);
    if (!Number.isInteger(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectBrand(pan: string): CardBrand {
  if (/^4/.test(pan)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(pan)) return 'mastercard';
  if (/^3[47]/.test(pan)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(pan)) return 'discover';
  return 'card';
}

export function formatExp(month: number, year: number): string {
  const yy = String(year % 100).padStart(2, '0');
  return `${String(month).padStart(2, '0')}/${yy}`;
}

export function parseCardInput(raw: unknown): CardInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const holderName = String(body.holderName ?? '').trim() || 'Demo cardholder';
  const number = digitsOnly(String(body.number ?? '')) || '4242424242424242';
  const cvc = digitsOnly(String(body.cvc ?? '')) || '123';
  let expMonth = Number(body.expMonth);
  let expYear = Number(body.expYear);

  if (number.length < 12 || number.length > 19) {
    throw new ValidationError('Enter a card number (demo: 4242 4242 4242 4242).');
  }

  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
    expMonth = 12;
  }
  if (expYear > 0 && expYear < 100) expYear += 2000;
  if (!Number.isInteger(expYear) || expYear < 2000) {
    expYear = new Date().getFullYear() + 2;
  }
  // Demo checkout: expired dates still pay. Only the dedicated decline PAN fails.

  return { holderName: holderName.slice(0, 80), number, expMonth, expYear, cvc: cvc.slice(0, 4) };
}

export type ChargedCard = {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
};

/** Authorize a card. PAN and CVC are never returned or persisted. */
export function chargeCard(card: CardInput, amount: number): ChargedCard {
  if (card.number === DECLINE_PAN) {
    throw new ValidationError('Your card was declined.');
  }
  if (amount < 0) throw new ValidationError('Invalid charge amount.');
  return {
    brand: detectBrand(card.number),
    last4: card.number.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
    holderName: card.holderName,
  };
}
