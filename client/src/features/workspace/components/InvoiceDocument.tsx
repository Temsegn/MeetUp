import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';
import type { BillingInvoice } from '../../../services/workspace/workspace.service';

export function money(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function InvoiceStatusPill({ status }: { status: string }) {
  const label = status === 'issued' ? 'Due' : status;
  const cls =
    status === 'paid'
      ? 'bg-[#D5F9E0] text-[#00A159]'
      : status === 'void'
        ? 'bg-[#F3F6FA] text-[#6F7B8C]'
        : 'bg-[#FFF4D6] text-[#B45309]';
  return (
    <span className={cn('inline-flex rounded-full px-3 py-0.5 text-[11px] font-semibold capitalize', cls)}>
      {label}
    </span>
  );
}

export function InvoiceDocument({
  invoice,
  backTo,
  canPay,
  paying,
  onPay,
  onPrint,
}: {
  invoice: BillingInvoice;
  backTo: string;
  canPay?: boolean;
  paying?: boolean;
  onPay?: () => void;
  onPrint?: () => void;
}) {
  const period = `${fmtDate(invoice.periodStart)} – ${fmtDate(invoice.periodEnd)}`;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[12px]">
        <Link to={backTo} className="text-[#62728F] hover:text-[#091A49]">
          Invoices
        </Link>
        <span className="text-[rgba(98,114,143,0.6)]">›</span>
        <span className="font-semibold text-[#091A49]">{invoice.number}</span>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#091A49] sm:text-[22px]">
              Invoice {invoice.number}
            </h1>
            <InvoiceStatusPill status={invoice.status} />
          </div>
          <p className="mt-1 text-[12px] text-[#62728F]">
            Issued {fmtDate(invoice.issuedAt)}
            {invoice.paidAt ? ` • Paid ${fmtDate(invoice.paidAt)}` : ` • Due ${fmtDate(invoice.dueAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#2857E5]"
          >
            Print / Save PDF
          </button>
          {canPay && invoice.status === 'issued' ? (
            <button
              type="button"
              disabled={paying}
              onClick={onPay}
              className="inline-flex h-9 items-center rounded-xl bg-[#016BE6] px-3 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {paying ? 'Marking paid…' : 'Mark paid'}
            </button>
          ) : null}
        </div>
      </div>

      <section className="mb-3 overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white">
        <div className="grid lg:grid-cols-3">
          <div className="border-b border-[#E1E7EE] p-4 lg:border-r lg:border-b-0">
            <h2 className="text-[13px] font-semibold text-[#091A49]">From</h2>
            <p className="mt-3 text-[13px] font-bold text-[#091A49]">Samtal</p>
            <p className="text-[12px] leading-5 text-[#62728F]">hello@samtal.com</p>
            <p className="text-[12px] leading-5 text-[#62728F]">Platform billing</p>
          </div>
          <div className="border-b border-[#E1E7EE] p-4 lg:border-r lg:border-b-0">
            <h2 className="text-[13px] font-semibold text-[#091A49]">Bill To</h2>
            <p className="mt-3 text-[13px] font-bold text-[#091A49]">{invoice.organization}</p>
            {invoice.email ? <p className="text-[12px] leading-5 text-[#62728F]">{invoice.email}</p> : null}
            <p className="text-[12px] leading-5 text-[#62728F] capitalize">{invoice.planKey} plan</p>
          </div>
          <div className="p-4">
            <h2 className="text-[13px] font-semibold text-[#091A49]">Payment Summary</h2>
            <p className="mt-2 text-[28px] font-bold tracking-tight text-[#091A49]">
              {money(invoice.total, invoice.currency)}
            </p>
            <div className="mt-4 space-y-2.5 border-t border-[#E1E7EE] pt-4 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Payment method</span>
                <span className="text-[#091A49]">Invoice (manual settlement)</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Billing period</span>
                <span className="text-[#091A49]">{period}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Due date</span>
                <span className="text-[#091A49]">{fmtDate(invoice.dueAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Status</span>
                <InvoiceStatusPill status={invoice.status} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-3 overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white p-4">
        <h2 className="text-[13px] font-bold text-[#091A49]">Line items</h2>
        <table className="mt-3 w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[#E1E7EE] text-[#62728F]">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={`${item.description}-${i}`} className="border-b border-[#E1E7EE]">
                <td className="py-3 font-semibold text-[#091A49]">{item.description}</td>
                <td className="py-3 text-right text-[#091A49]">{item.quantity}</td>
                <td className="py-3 text-right text-[#091A49]">{money(item.unitAmount, invoice.currency)}</td>
                <td className="py-3 text-right font-medium text-[#091A49]">
                  {money(item.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-full max-w-[280px] space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#62728F]">Subtotal</span>
            <span className="text-[#091A49]">{money(invoice.subtotal, invoice.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#62728F]">Tax</span>
            <span className="text-[#091A49]">{money(invoice.tax, invoice.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#E1E7EE] pt-2.5">
            <span className="text-[14px] font-bold text-[#091A49]">Total</span>
            <span className="text-[14px] font-bold text-[#091A49]">
              {money(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>
      </section>

      {invoice.notes ? (
        <section className="rounded-2xl border border-[#E1E7EE] bg-white p-4">
          <h2 className="text-[13px] font-bold text-[#091A49]">Notes</h2>
          <p className="mt-2 text-[12px] text-[#62728F]">{invoice.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
