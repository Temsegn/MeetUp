import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  workspaceService,
  type BillingInvoice,
  type CheckoutCard,
  type PaymentMethodInfo,
} from '../../../services/workspace/workspace.service';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { PlanCheckoutModal } from '../components/PlanCheckoutModal';
import { InvoiceDocSkeleton } from '../../admin/components/AdminUi';

export function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const canPay = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (!activeWorkspace?.workspaceId || !invoiceId) return;
    workspaceService
      .getInvoice(activeWorkspace.workspaceId, invoiceId)
      .then(setInvoice)
      .catch((err) => setError(err instanceof Error ? err.message : 'Invoice not found.'));
    workspaceService
      .listPaymentMethods(activeWorkspace.workspaceId)
      .then((data) => setMethods(data.paymentMethods))
      .catch(() => setMethods([]));
  }, [activeWorkspace?.workspaceId, invoiceId]);

  const pay = async (card?: CheckoutCard) => {
    if (!activeWorkspace?.workspaceId || !invoiceId) return;
    setPaying(true);
    setError(null);
    try {
      const paid = await workspaceService.payInvoice(activeWorkspace.workspaceId, invoiceId, card);
      setInvoice(paid);
      setCheckoutOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
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
    return <InvoiceDocSkeleton />;
  }

  return (
    <div className="-mx-3.5 min-h-0 flex-1 overflow-y-auto bg-white px-3.5 py-4 sm:-mx-5 sm:px-5 md:-ml-6 md:px-6 lg:-mr-6">
      {error && !checkoutOpen ? <p className="mb-3 text-[12px] text-[#DC2626]">{error}</p> : null}
      <InvoiceDocument
        invoice={invoice}
        backTo="/app/billing"
        canPay={canPay}
        paying={paying}
        onPay={() => {
          if (invoice.total <= 0) {
            void pay();
            return;
          }
          setError(null);
          setCheckoutOpen(true);
        }}
        onPrint={() => window.print()}
      />
      <PlanCheckoutModal
        open={checkoutOpen}
        mode="invoice"
        title={`Pay ${invoice.number}`}
        amount={invoice.total}
        currency={invoice.currency}
        savedMethods={methods}
        busy={paying}
        error={error}
        onClose={() => {
          setCheckoutOpen(false);
          setError(null);
        }}
        onPay={pay}
      />
    </div>
  );
}
