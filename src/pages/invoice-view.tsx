import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { CheckCircle, Loader2, XCircle, FileText } from 'lucide-react';
import { invoice_view } from 'virtual:content';

interface LineItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  type: string;
}

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  projectDescription: string | null;
  subtotal: string;
  taxRate: string;
  tax: string;
  total: string;
  dueDate: string | null;
  notes: string | null;
  lineItems: LineItem[];
}

export default function InvoiceViewPage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [cashPaying, setCashPaying] = useState(false);
  const [cashPaid, setCashPaid] = useState(false);
  const [cashError, setCashError] = useState('');
  const [checkPaying, setCheckPaying] = useState(false);
  const [checkPaid, setCheckPaid] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [transferPaying, setTransferPaying] = useState(false);
  const [transferPaid, setTransferPaid] = useState(false);
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid link.'); setLoading(false); return; }
    fetch(`/api/invoices/view/${token}`)
      .then(r => r.json())
      .then((data: InvoiceData & { error?: string }) => {
        if (data.error) setError(data.error);
        else setInvoice(data);
      })
      .catch(() => setError('Could not load invoice. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    if (!token) return;
    setPaying(true);
    setPayError('');
    try {
      const res = await fetch(`/api/invoices/view/${token}/checkout`, { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPayError(data.error ?? 'Could not start payment. Please contact us.');
        setPaying(false);
      }
    } catch {
      setPayError('Something went wrong. Please contact us directly.');
      setPaying(false);
    }
  };

  const handleCashPay = async () => {
    if (!token) return;
    setCashPaying(true);
    setCashError('');
    try {
      const res = await fetch('/api/invoices/view/' + token + '/cash-payment', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; alreadyPaid?: boolean; error?: string };
      if (data.ok) {
        setCashPaid(true);
        setInvoice(prev => prev ? { ...prev, status: 'paid' } : prev);
      } else {
        setCashError(data.error ?? 'Could not record payment. Please contact us.');
      }
    } catch {
      setCashError('Something went wrong. Please contact us directly.');
    } finally {
      setCashPaying(false);
    }
  };

  const handleCheckPay = async () => {
    if (!token) return;
    setCheckPaying(true);
    setCheckError('');
    try {
      const res = await fetch('/api/invoices/view/' + token + '/check-payment', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; alreadyPaid?: boolean; error?: string };
      if (data.ok) {
        setCheckPaid(true);
        setInvoice(prev => prev ? { ...prev, status: 'paid' } : prev);
      } else {
        setCheckError(data.error ?? 'Could not record payment. Please contact us.');
      }
    } catch {
      setCheckError('Something went wrong. Please contact us directly.');
    } finally {
      setCheckPaying(false);
    }
  };

  const handleTransferPay = async () => {
    if (!token) return;
    setTransferPaying(true);
    setTransferError('');
    try {
      const res = await fetch('/api/invoices/view/' + token + '/transfer-payment', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; alreadyPaid?: boolean; error?: string };
      if (data.ok) {
        setTransferPaid(true);
        setInvoice(prev => prev ? { ...prev, status: 'paid' } : prev);
      } else {
        setTransferError(data.error ?? 'Could not record payment. Please contact us.');
      }
    } catch {
      setTransferError('Something went wrong. Please contact us directly.');
    } finally {
      setTransferPaying(false);
    }
  };

  const fmtCur = (v: string | number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

  const statusStyle = (status: string): React.CSSProperties => {
    if (status === 'paid') return { background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' };
    if (status === 'overdue') return { background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' };
    if (status === 'cancelled') return { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
    return { background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' };
  };

  const isPaid = invoice?.status === 'paid';
  const canPay = invoice && !isPaid && invoice.status !== 'cancelled' && Number(invoice.total) > 0;

  return (
    <>
      <Helmet>
        <title>{invoice ? `Invoice ${invoice.invoiceNumber} — Dust to Done` : 'Invoice — Dust to Done'}</title>
        <meta name="description" content={invoice_view.pageDescription} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-muted/40 py-8 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="bg-primary rounded-t-xl px-8 py-6 flex items-center gap-3">
            <FileText className="text-primary-foreground w-7 h-7 shrink-0" />
            <div>
              <h1 className="text-primary-foreground font-bold text-xl m-0">{invoice_view.companyName}</h1>
              <p className="text-primary-foreground/75 text-sm mt-1 mb-0">{invoice_view.companySubtitle}</p>
            </div>
          </div>

          <div className="bg-card border border-border border-t-0 rounded-b-xl px-8 py-7">

            {loading && (
              <div className="text-center py-10">
                <Loader2 className="w-9 h-9 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-muted-foreground m-0">{invoice_view.loadingText}</p>
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-10">
                <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="text-foreground font-semibold mb-2">{invoice_view.notFoundTitle}</p>
                <p className="text-muted-foreground text-sm m-0">{error}</p>
              </div>
            )}

            {!loading && invoice && (
              <>
                {/* Summary */}
                <table className="w-full border-collapse mb-6">
                  <tbody>
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm w-40">{invoice_view.summaryLabels.invoiceNumber}</td>
                      <td className="py-1.5 font-bold text-sm text-foreground">{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm">{invoice_view.summaryLabels.billedTo}</td>
                      <td className="py-1.5 font-semibold text-sm text-foreground">{invoice.clientName}</td>
                    </tr>
                    {invoice.projectDescription && (
                      <tr>
                        <td className="py-1.5 text-muted-foreground text-sm">{invoice_view.summaryLabels.project}</td>
                        <td className="py-1.5 text-sm text-foreground">{invoice.projectDescription}</td>
                      </tr>
                    )}
                    {invoice.dueDate && (
                      <tr>
                        <td className="py-1.5 text-muted-foreground text-sm">{invoice_view.summaryLabels.dueDate}</td>
                        <td className="py-1.5 font-semibold text-sm text-foreground">{invoice.dueDate}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm">{invoice_view.summaryLabels.status}</td>
                      <td className="py-1.5">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={statusStyle(invoice.status)}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Line items */}
                {invoice.lineItems.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground border-b-2 border-primary pb-1.5 mb-3">{invoice_view.lineItemsHeading}</h3>
                    <table className="w-full border-collapse text-sm mb-5">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">{invoice_view.tableHeaders.description}</th>
                          <th className="px-2 py-1.5 text-center text-muted-foreground font-semibold">{invoice_view.tableHeaders.qty}</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{invoice_view.tableHeaders.unitPrice}</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{invoice_view.tableHeaders.total}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.lineItems.map(li => (
                          <tr key={li.id} className="border-b border-border">
                            <td className="px-2 py-1.5 text-foreground">{li.description}</td>
                            <td className="px-2 py-1.5 text-center text-foreground">{li.quantity}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{fmtCur(li.unitPrice)}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{fmtCur(li.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <table className="border-collapse text-sm min-w-[220px]">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-3 text-muted-foreground">{invoice_view.totalsLabels.subtotal}</td>
                        <td className="py-1 text-right text-foreground">{fmtCur(invoice.subtotal)}</td>
                      </tr>
                      {Number(invoice.tax) > 0 && (
                        <tr>
                          <td className="py-1 pr-3 text-muted-foreground">{invoice_view.totalsLabels.tax} ({invoice.taxRate}%)</td>
                          <td className="py-1 text-right text-foreground">{fmtCur(invoice.tax)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-border">
                        <td className="pt-2 pr-3 font-bold text-base text-foreground">{invoice_view.totalsLabels.total}</td>
                        <td className="pt-2 text-right font-bold text-lg text-primary">{fmtCur(invoice.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {invoice.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 mb-6">
                    <strong className="text-foreground">{invoice_view.notesLabel}:</strong> {invoice.notes}
                  </p>
                )}

                {/* Pay / Paid state */}
                {isPaid || cashPaid || checkPaid || transferPaid ? (
                  <div className="text-center py-5">
                    <CheckCircle className="w-10 h-10 text-[hsl(var(--success))] mx-auto mb-2.5" />
                    <p className="font-bold text-base text-[hsl(var(--success))] m-0">{invoice_view.paidTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1.5 mb-0">{invoice_view.paidMessage}</p>
                  </div>
                ) : canPay && (
                  <div className="pt-2 space-y-3">
                    {/* Pay online via Stripe */}
                    <div className="text-center">
                      <button
                        onClick={() => void handlePay()}
                        disabled={paying || cashPaying || checkPaying || transferPaying}
                        className="w-full max-w-xs bg-primary text-primary-foreground font-bold text-base py-3.5 px-10 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer border-0"
                      >
                        {paying ? invoice_view.payingButton : invoice_view.payButton}
                      </button>
                      {payError && (
                        <p className="text-sm text-destructive mt-2 mb-0">{payError}</p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 max-w-xs mx-auto">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or pay offline</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Pay with cash */}
                    <div className="text-center">
                      <button
                        onClick={() => void handleCashPay()}
                        disabled={cashPaying || paying || checkPaying || transferPaying}
                        className="w-full max-w-xs bg-card text-foreground font-semibold text-base py-3.5 px-10 rounded-lg border-2 border-border hover:border-primary hover:text-primary disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {cashPaying ? 'Recording…' : 'I will pay with Cash'}
                      </button>
                      {cashError && (
                        <p className="text-sm text-destructive mt-2 mb-0">{cashError}</p>
                      )}
                    </div>

                    {/* Pay with check */}
                    <div className="text-center">
                      <button
                        onClick={() => void handleCheckPay()}
                        disabled={checkPaying || paying || cashPaying || transferPaying}
                        className="w-full max-w-xs bg-card text-foreground font-semibold text-base py-3.5 px-10 rounded-lg border-2 border-border hover:border-primary hover:text-primary disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {checkPaying ? 'Recording…' : 'I will pay with Check'}
                      </button>
                      {checkError && (
                        <p className="text-sm text-destructive mt-2 mb-0">{checkError}</p>
                      )}
                    </div>

                    {/* Pay with bank transfer */}
                    <div className="text-center">
                      <button
                        onClick={() => void handleTransferPay()}
                        disabled={transferPaying || paying || cashPaying || checkPaying}
                        className="w-full max-w-xs bg-card text-foreground font-semibold text-base py-3.5 px-10 rounded-lg border-2 border-border hover:border-primary hover:text-primary disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {transferPaying ? 'Recording…' : 'I will pay with Bank Transfer'}
                      </button>
                      {transferError && (
                        <p className="text-sm text-destructive mt-2 mb-0">{transferError}</p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-1 mb-0">
                      Selecting an offline option confirms your intent to pay. Your contractor will be notified and will follow up with any details needed.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-center mt-5 text-xs text-muted-foreground">
            {invoice_view.companyFooter}
          </p>
        </div>
      </div>
    </>
  );
}
