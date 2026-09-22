import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { workspaceService, type BillingInvoice } from '../../../services/workspace/workspace.service';
import { InvoiceDocument } from '../components/InvoiceDocument';

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const canPay = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !invoiceId) return;
    workspaceService
      .getInvoice(activeWorkspace.workspaceId, invoiceId)
      .then(setInvoice)
      .catch((err) => setError(err instanceof Error ? err.message : 'Invoice not found.'));
  }, [activeWorkspace?.workspaceId, invoiceId]);

  const pay = async () => {
    if (!activeWorkspace?.workspaceId || !invoiceId) return;
    setPaying(true);
    setError(null);
    try {
      const paid = await workspaceService.payInvoice(activeWorkspace.workspaceId, invoiceId);
      setInvoice(paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark invoice paid.');
    } finally {
      setPaying(false);
    }
  };

  if (error && !invoice) {
    return (
      <div className="p-6">
        <p className="text-[13px] text-[#DC2626]">{error}</p>
        <button
          type="button"
          className="mt-3 text-[12px] font-semibold text-[#016BE6]"
          onClick={() => navigate('/app/billing')}
        >
          Back to billing
        </button>
      </div>
    );
  }

  if (!invoice) {
    return <p className="p-6 text-[13px] text-[#6F7B8C]">Loading invoice…</p>;
  }

  return (
    <div className="-mx-3.5 min-h-0 flex-1 overflow-y-auto bg-white px-3.5 py-4 sm:-mx-5 sm:px-5 md:-ml-6 md:px-6 lg:-mr-6">
      {error ? <p className="mb-3 text-[12px] text-[#DC2626]">{error}</p> : null}
      <InvoiceDocument
        invoice={invoice}
        backTo="/app/billing"
        canPay={canPay}
        paying={paying}
        onPay={() => void pay()}
        onPrint={() => window.print()}
      />
    </div>
  );
}
