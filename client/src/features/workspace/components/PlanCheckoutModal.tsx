import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CheckoutCard, PaymentMethodInfo } from '../../../services/workspace/workspace.service';
import { money } from './InvoiceDocument';

type CheckoutMode = 'upgrade' | 'invoice' | 'card';

export function PlanCheckoutModal({
  open,
  mode,
  title,
  amount,
  currency = 'USD',
  savedMethods = [],
  busy,
  error,
  onClose,
  onPay,
}: {
  open: boolean;
  mode: CheckoutMode;
  title: string;
  amount: number;
  currency?: string;
  savedMethods?: PaymentMethodInfo[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onPay: (card?: CheckoutCard) => Promise<void> | void;
}) {
  const defaultSaved = savedMethods.find((m) => m.isDefault) ?? savedMethods[0] ?? null;
  const [useSaved, setUseSaved] = useState(Boolean(defaultSaved));
  const [holderName, setHolderName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!open) return;
    setUseSaved(Boolean(defaultSaved));
    setHolderName('Demo User');
    setNumber(formatCardNumber('4242424242424242'));
    setExpiry('12/30');
    setCvc('123');
  }, [open, defaultSaved]);

  if (!open) return null;

  const submit = async () => {
    if (useSaved && defaultSaved && amount > 0 && mode !== 'card') {
      await onPay(undefined);
      return;
    }
    const parsed = parseExpiry(expiry);
    await onPay({
      holderName: holderName.trim(),
      number: number.replace(/\D/g, ''),
      expMonth: parsed?.month ?? 0,
      expYear: parsed?.year ?? 0,
      cvc: cvc.replace(/\D/g, ''),
    });
  };

  const payLabel =
    mode === 'card'
      ? 'Save card'
      : amount > 0
        ? `Pay ${money(amount, currency)}`
        : 'Confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-[420px] rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#151D2B]">{title}</h2>
            {mode !== 'card' ? (
              <p className="mt-0.5 text-[12px] text-[#6F7B8C]">
                Demo checkout — no real charge.
                {amount > 0 ? ` ${money(amount, currency)} is recorded as paid.` : ''}
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-[#6F7B8C]">Demo card only. Number is never stored.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6F7B8C] hover:bg-[#F3F6FA]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {defaultSaved && mode !== 'card' ? (
          <div className="mb-3 space-y-2">
            <label className="flex items-center gap-2 text-[12px] text-[#151D2B]">
              <input
                type="radio"
                checked={useSaved}
                onChange={() => setUseSaved(true)}
              />
              Use {labelBrand(defaultSaved.brand)} •••• {defaultSaved.last4} · {defaultSaved.exp}
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#151D2B]">
              <input
                type="radio"
                checked={!useSaved}
                onChange={() => setUseSaved(false)}
              />
              Use a new card
            </label>
          </div>
        ) : null}

        {!useSaved || mode === 'card' || !defaultSaved ? (
          <div className="space-y-3">
            <Field
              label="Name on card"
              value={holderName}
              onChange={setHolderName}
              autoComplete="cc-name"
            />
            <Field
              label="Card number"
              value={number}
              onChange={(v) => setNumber(formatCardNumber(v))}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Expiry"
                value={expiry}
                onChange={(v) => setExpiry(formatExpiry(v))}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
              />
              <Field
                label="CVC"
                value={cvc}
                onChange={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
              />
            </div>
            <p className="text-[11px] text-[#059669]">
              Demo OK — any expiry is accepted (including past dates). Click pay to upgrade.
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-[12px] text-[#DC2626]">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-[#E8ECF1] text-[12px] font-semibold text-[#475569]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="h-10 flex-1 rounded-xl bg-[#016BE6] text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
          >
            {busy ? 'Processing…' : payLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
    inputMode?: 'numeric' | 'text';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[#6F7B8C]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="h-10 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px] text-[#151D2B] outline-none focus:border-[#016BE6]"
      />
    </label>
  );
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseExpiry(value: string): { month: number; year: number } | null {
  const [mm, yy] = value.split('/');
  const month = Number(mm);
  const year = Number(yy);
  if (!Number.isInteger(month) || !Number.isInteger(year)) return null;
  return { month, year: year < 100 ? 2000 + year : year };
}

function labelBrand(brand: string) {
  if (!brand) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
