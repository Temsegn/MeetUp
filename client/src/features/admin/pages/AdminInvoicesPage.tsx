import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader, AdminTableShell } from '../components/AdminUi';
import {
  fmtDate,
  InvoiceDocument,
  InvoiceStatusPill,
  money,
} from '../../workspace/components/InvoiceDocument';
import type { BillingInvoice } from '../../../services/workspace/workspace.service';

function asInvoice(row: Record<string, unknown>): BillingInvoice {
  return {
    id: String(row.id),
    number: String(row.number ?? ''),
    workspaceId: String(row.workspaceId ?? ''),
    organization: String(row.organization ?? '—'),
    email: String(row.email ?? ''),
    status: String(row.status ?? 'issued'),
    planKey: String(row.planKey ?? ''),
    currency: String(row.currency ?? 'USD'),
    subtotal: Number(row.subtotal ?? 0),
    tax: Number(row.tax ?? 0),
    total: Number(row.total ?? 0),
    periodStart: String(row.periodStart ?? ''),
    periodEnd: String(row.periodEnd ?? ''),
    lineItems: Array.isArray(row.lineItems)
      ? (row.lineItems as BillingInvoice['lineItems'])
      : [],
    issuedAt: String(row.issuedAt ?? ''),
    paidAt: row.paidAt ? String(row.paidAt) : null,
    dueAt: String(row.dueAt ?? ''),
    notes: String(row.notes ?? ''),
  };
}

export function AdminInvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .invoices({ search, status, limit: 100 })
      .then((res) => setItems((res.items ?? []).map((row) => asInvoice(row))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, [search, status]);

  return (
    <div>
      <AdminPageHeader
        title="Invoices"
        subtitle="Generated from each workspace plan and participant-minute usage."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-[220px] max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organization or invoice number…"
            className="h-10 w-full rounded-xl border border-[#E8ECF1] bg-white pr-3 pl-9 text-[13px]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-[#E8ECF1] bg-white px-3 text-[13px]"
        >
          <option value="">All statuses</option>
          <option value="issued">Due</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
      </div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <AdminTableShell>
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wide text-[#6F7B8C]">
            <tr>
              <th className="px-4 py-2.5">Invoice</th>
              <th className="px-4 py-2.5">Organization</th>
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5">Amount</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv) => (
              <tr key={inv.id} className="border-t border-[#E8ECF1]">
                <td className="px-4 py-3">
                  <Link to={`/admin/invoices/${inv.id}`} className="font-semibold hover:text-[#016BE6]">
                    {inv.number}
                  </Link>
                  <p className="text-[11px] text-[#94A3B8]">{fmtDate(inv.issuedAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{inv.organization}</p>
                  <p className="text-[11px] text-[#94A3B8]">{inv.email || inv.planKey}</p>
                </td>
                <td className="px-4 py-3 text-[#6F7B8C]">
                  {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                </td>
                <td className="px-4 py-3 font-semibold">{money(inv.total, inv.currency)}</td>
                <td className="px-4 py-3">
                  <InvoiceStatusPill status={inv.status} />
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                  No invoices yet. They appear after workspaces have an active plan period.
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                  Loading invoices…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

export function AdminInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi
      .getInvoice(id)
      .then((row) => setInvoice(asInvoice(row)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Invoice not found.'));
  }, [id]);

  const pay = async () => {
    if (!id) return;
    setPaying(true);
    setError(null);
    try {
      const row = await adminApi.payInvoice(id);
      setInvoice(asInvoice(row));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark invoice paid.');
    } finally {
      setPaying(false);
    }
  };

  if (error && !invoice) {
    return (
      <div>
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          className="mt-3 text-[12px] font-semibold text-[#016BE6]"
          onClick={() => navigate('/admin/invoices')}
        >
          Back to invoices
        </button>
      </div>
    );
  }

  if (!invoice) return <p className="text-sm text-[#6F7B8C]">Loading invoice…</p>;

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <InvoiceDocument
        invoice={invoice}
        backTo="/admin/invoices"
        canPay
        paying={paying}
        onPay={() => void pay()}
        onPrint={() => window.print()}
      />
    </div>
  );
}
