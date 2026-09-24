import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/admin.service';
import {
  AdminPageHeader,
  AdminTable,
  AdminTableShell,
  AdminTHead,
  AlertBanner,
  EmptyState,
  FilterChips,
  InvoiceDocSkeleton,
  SearchField,
  TableSkeleton,
  useDebouncedValue,
} from '../components/AdminUi';
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
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .invoices({ search: debouncedSearch, status, limit: 100 })
      .then((res) => setItems((res.items ?? []).map((row) => asInvoice(row))))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, status]);

  return (
    <div>
      <AdminPageHeader
        title="Invoices"
        subtitle="Generated from each organization plan and participant-minute usage."
      />
      <div className="mb-4">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { key: '', label: 'All' },
            { key: 'issued', label: 'Due', dot: 'bg-[#F97316]' },
            { key: 'paid', label: 'Paid', dot: 'bg-[#22C55E]' },
            { key: 'void', label: 'Void', dot: 'bg-[#64748B]' },
          ]}
        />
      </div>
      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      <AdminTableShell
        title={`Invoices (${items.length})`}
        subtitle="Search by organization or invoice number."
        toolbar={
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search organization or invoice…"
            className="sm:w-[260px]"
          />
        }
      >
        {loading ? (
          <TableSkeleton cols={5} />
        ) : (
          <AdminTable>
            <AdminTHead
              columns={[
                { label: 'Invoice' },
                { label: 'Organization' },
                { label: 'Period' },
                { label: 'Amount' },
                { label: 'Status' },
              ]}
            />
            <tbody>
              {items.length === 0 ? (
                <EmptyState
                  colSpan={5}
                  title="No invoices yet"
                  description="They appear after organizations have an active plan period."
                />
              ) : (
                items.map((inv) => (
                  <tr key={inv.id} className="border-t border-[#E2E7ED]/70 text-[12px] text-[#151D2B]">
                    <td className="px-4 py-3">
                      <Link to={`/admin/invoices/${inv.id}`} className="font-semibold hover:text-[#016BE6]">
                        {inv.number}
                      </Link>
                      <p className="text-[11px] text-[#94A3B8]">{fmtDate(inv.issuedAt)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-medium">{inv.organization}</p>
                      <p className="text-[11px] text-[#94A3B8]">{inv.email || inv.planKey}</p>
                    </td>
                    <td className="px-2 py-3 text-[#6F7B8C]">
                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                    </td>
                    <td className="px-2 py-3 font-semibold">{money(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusPill status={inv.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        )}
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

  if (!invoice) return <InvoiceDocSkeleton />;

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
