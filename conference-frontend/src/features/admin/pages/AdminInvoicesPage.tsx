import { Link } from 'react-router-dom';
import { cn } from '../../../lib/cn';

import iconDownload from '../assets/invoices/download.svg';
import iconChevron from '../assets/invoices/chevron.svg';
import iconMeetings from '../assets/invoices/item-meetings.svg';
import iconRecordings from '../assets/invoices/item-recordings.svg';
import iconParticipants from '../assets/invoices/item-participants.svg';
import iconIntegrations from '../assets/invoices/item-integrations.svg';
import iconCheck from '../assets/invoices/check.svg';
import iconMail from '../assets/invoices/mail.svg';
import iconSupport from '../assets/invoices/support.svg';
import iconPaidCheck from '../assets/invoices/paid-check.svg';

/** Exact Figma catalog (16:3528) — Invoice · Samtal Billing. */
const INVOICE = {
  number: 'INV-2025-000128',
  status: 'Paid' as const,
  issuedOn: 'Apr 22, 2025',
  paidOn: 'Apr 22, 2025',
  amount: 299,
  subtotal: 299.3,
  discount: -0.3,
  tax: 0,
  from: {
    name: 'Samtal Technologies',
    letter: 'S',
    iconBg: '#2857E5',
    lines: [
      '1234 Market Street',
      'San Francisco, CA 94103',
      'United States',
      'hello@samtal.com',
      '+1 (415) 123-4567',
      'Tax ID: 12-3456789',
    ],
  },
  billTo: {
    name: 'Samtal Technologies',
    lines: [
      '1234 Market Street',
      'San Francisco, CA 94103',
      'United States',
      'Attention: Sarah Johnson',
      'sarah.j@example.com',
      '+1 (415) 987-6543',
    ],
  },
  payment: {
    methodLabel: 'Visa ending in 4242',
    billingCycle: 'Apr 22 – May 22, 2025',
    dueDate: 'Apr 22, 2025',
  },
  items: [
    {
      name: 'Meetings',
      description: 'Advanced meeting features and hosting',
      qty: '312 mins',
      unit: '$0.40 / min',
      amount: 124.8,
      icon: iconMeetings,
    },
    {
      name: 'Recordings Storage',
      description: 'Cloud storage for meeting recordings',
      qty: '312 mins',
      unit: '$0.40 / min',
      amount: 124.8,
      icon: iconRecordings,
    },
    {
      name: 'Participants',
      description: 'Additional participants',
      qty: '312 mins',
      unit: '$0.40 / min',
      amount: 124.8,
      icon: iconParticipants,
    },
    {
      name: 'Active Integrations',
      description: 'Third-party integrations',
      qty: '312 mins',
      unit: '$0.40 / min',
      amount: 124.8,
      icon: iconIntegrations,
    },
  ],
  activity: [
    {
      title: 'Invoice paid',
      when: 'Apr 22, 2025 • 10:33 AM',
      detail: 'Payment of $299.00 was successful via Visa ending in 4242',
      icon: iconCheck,
    },
    {
      title: 'Payment processing',
      when: 'Apr 22, 2025 • 10:32 AM',
      detail: 'Your payment is being processed',
      icon: iconCheck,
    },
    {
      title: 'Invoice sent',
      when: 'Apr 22, 2025 • 10:31 AM',
      detail: 'Invoice was emailed to sarah.j@example.com',
      icon: iconMail,
    },
    {
      title: 'Invoice created',
      when: 'Apr 22, 2025 • 10:30 AM',
      detail: 'Invoice was created',
      icon: iconCheck,
    },
  ],
  notes:
    'Thank you for your business! If you have any questions, feel free to reach out to our support team.',
};

function IconImg({
  src,
  size = 16,
  className,
  alt = '',
}: {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}

function PaidPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full bg-[#D5F9E0] px-3 py-0.5 text-[11px] font-semibold text-[#00A159]',
        className,
      )}
    >
      Paid
    </span>
  );
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AdminInvoicesPage() {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[12px]">
        <Link to="/admin/invoices" className="text-[#62728F] hover:text-[#091A49]">
          Invoices
        </Link>
        <span className="text-[rgba(98,114,143,0.6)]">›</span>
        <span className="font-semibold text-[#091A49]">{INVOICE.number}</span>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#091A49] sm:text-[22px]">
              Invoice {INVOICE.number}
            </h1>
            <PaidPill />
          </div>
          <p className="mt-1 text-[12px] text-[#62728F]">
            Issued on {INVOICE.issuedOn} • Paid on {INVOICE.paidOn}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#2857E5]"
          >
            <IconImg src={iconDownload} size={14} /> Download PDF
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] bg-white px-3 text-[12px] font-semibold text-[#091A49]"
          >
            More Actions <IconImg src={iconChevron} size={14} />
          </button>
        </div>
      </div>

      {/* From / Bill To / Payment Summary */}
      <section className="mb-3 overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white">
        <div className="grid lg:grid-cols-3">
          <div className="border-b border-[#E1E7EE] p-4 lg:border-r lg:border-b-0">
            <h2 className="text-[13px] font-semibold text-[#091A49]">From</h2>
            <div className="mt-3 flex gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-bold text-white"
                style={{ background: INVOICE.from.iconBg }}
              >
                {INVOICE.from.letter}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#091A49]">{INVOICE.from.name}</p>
                {INVOICE.from.lines.map((line) => (
                  <p key={line} className="text-[12px] leading-5 text-[#62728F]">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="border-b border-[#E1E7EE] p-4 lg:border-r lg:border-b-0">
            <h2 className="text-[13px] font-semibold text-[#091A49]">Bill To</h2>
            <div className="mt-3">
              <p className="text-[13px] font-bold text-[#091A49]">{INVOICE.billTo.name}</p>
              {INVOICE.billTo.lines.map((line) => (
                <p key={line} className="text-[12px] leading-5 text-[#62728F]">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold text-[#091A49]">Payment Summary</h2>
                <p className="mt-2 text-[28px] font-bold tracking-tight text-[#091A49]">
                  {money(INVOICE.amount)}{' '}
                  <span className="text-[13px] font-medium text-[#62728F]">USD</span>
                </p>
                <p className="mt-0.5 text-[12px] text-[#62728F]">Paid on {INVOICE.paidOn}</p>
              </div>
              <IconImg src={iconPaidCheck} size={28} />
            </div>

            <div className="mt-4 space-y-2.5 border-t border-[#E1E7EE] pt-4 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Payment Method</span>
                <span className="flex items-center gap-1.5">
                  <span className="rounded bg-[#F2F5FB] px-1.5 py-0.5 text-[10px] font-extrabold italic text-[#2857E5]">
                    VISA
                  </span>
                  <span className="text-[#091A49]">{INVOICE.payment.methodLabel}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Billing Cycle</span>
                <span className="text-[#091A49]">{INVOICE.payment.billingCycle}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Due Date</span>
                <span className="text-[#091A49]">{INVOICE.payment.dueDate}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#62728F]">Invoice Status</span>
                <PaidPill />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        {/* Invoice Items */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white p-4">
          <h2 className="text-[13px] font-bold text-[#091A49]">Invoice Items</h2>

          <table className="mt-3 w-full table-fixed text-left text-[12px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E1E7EE] text-[12px] font-medium text-[#62728F]">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Quantity</th>
                <th className="pb-2 text-right font-medium">Unit Price</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {INVOICE.items.map((item) => (
                <tr key={item.name} className="border-b border-[#E1E7EE]">
                  <td className="py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#E5EFFF]">
                        <IconImg src={item.icon} size={14} />
                      </span>
                      <span className="truncate font-semibold text-[#091A49]">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#62728F]">{item.description}</td>
                  <td className="py-3 text-right text-[#091A49]">{item.qty}</td>
                  <td className="py-3 text-right text-[#091A49]">{item.unit}</td>
                  <td className="py-3 text-right font-medium text-[#091A49]">{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-[280px] space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-[#62728F]">Subtotal</span>
              <span className="text-[#091A49]">{money(INVOICE.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#62728F]">Discount</span>
              <span className="text-[#00A159]">{money(INVOICE.discount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#62728F]">Tax (0%)</span>
              <span className="text-[#091A49]">{money(INVOICE.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#E1E7EE] pt-2.5">
              <span className="text-[14px] font-bold text-[#091A49]">Total</span>
              <span className="text-[14px] font-bold text-[#091A49]">
                {money(INVOICE.amount)}{' '}
                <span className="text-[11px] font-medium text-[#62728F]">USD</span>
              </span>
            </div>
          </div>
        </section>

        {/* Activity + Help */}
        <div className="space-y-3">
          <section className="rounded-2xl border border-[#E1E7EE] bg-white p-4">
            <h2 className="text-[13px] font-bold text-[#091A49]">Invoice Activity</h2>
            <ol className="relative mt-4 space-y-0">
              {INVOICE.activity.map((event, i) => (
                <li key={event.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < INVOICE.activity.length - 1 ? (
                    <span className="absolute top-9 bottom-0 left-[15px] w-px bg-[#E1E7EE]" />
                  ) : null}
                  <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-[#D5F9E0]">
                    <IconImg src={event.icon} size={14} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[12px] font-semibold text-[#091A49]">{event.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#62728F]">{event.when}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#62728F]">{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-[#E1E7EE] bg-white p-4">
            <h2 className="text-[13px] font-bold text-[#091A49]">Need Help?</h2>
            <p className="mt-2 text-[12px] leading-5 text-[#62728F]">
              If you have any questions about this invoice, our support team is here to help.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E1E7EE] px-3 text-[12px] font-semibold text-[#2857E5]"
            >
              <IconImg src={iconSupport} size={14} /> Contact Support
            </button>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-[#E1E7EE] bg-white p-4">
        <h2 className="text-[13px] font-bold text-[#091A49]">Notes</h2>
        <p className="mt-2 text-[12px] text-[#62728F]">{INVOICE.notes}</p>
      </section>
    </div>
  );
}
