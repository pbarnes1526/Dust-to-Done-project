import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { CheckCircle, Loader2, XCircle, FileText } from 'lucide-react';
import { estimate_view } from 'virtual:content';

interface LineItem {
  id: number;
  description: string;
  category: string;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  lineTotal: string;
  sortOrder: number;
}

interface EstimateData {
  id: number;
  estimateNumber: string;
  status: 'draft' | 'sent' | 'approved' | 'declined';
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  projectDescription: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  validUntil: string | null;
  lineItems: LineItem[];
}

export default function EstimateViewPage() {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid link.'); setLoading(false); return; }
    fetch(`/api/estimates/view/${token}`)
      .then(r => r.json())
      .then((data: EstimateData & { error?: string }) => {
        if (data.error) { setError(data.error); }
        else { setEstimate(data); if (data.status === 'approved') setAccepted(true); }
      })
      .catch(() => setError('Could not load estimate. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setAcceptError('');
    try {
      const res = await fetch(`/api/estimates/view/${token}/approve`, { method: 'POST' });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { setAccepted(true); setEstimate(prev => prev ? { ...prev, status: 'approved' } : prev); }
      else { setAcceptError(data.error ?? 'Could not accept estimate. Please contact us.'); }
    } catch {
      setAcceptError('Something went wrong. Please contact us directly.');
    } finally {
      setAccepting(false);
    }
  };

  const fmtCur = (v: string | number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

  const statusStyle = (status: string): React.CSSProperties => {
    if (status === 'approved') return { background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' };
    if (status === 'declined') return { background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' };
    return { background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' };
  };

  return (
    <>
      <Helmet>
        <title>{estimate ? `Estimate ${estimate.estimateNumber} — Dust to Done` : 'Estimate — Dust to Done'}</title>
        <meta name="description" content={estimate_view.pageDescription} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-muted/40 py-8 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="bg-primary rounded-t-xl px-8 py-6 flex items-center gap-3">
            <FileText className="text-primary-foreground w-7 h-7 shrink-0" />
            <div>
              <h1 className="text-primary-foreground font-bold text-xl m-0">{estimate_view.companyName}</h1>
              <p className="text-primary-foreground/75 text-sm mt-1 mb-0">{estimate_view.companySubtitle}</p>
            </div>
          </div>

          <div className="bg-card border border-border border-t-0 rounded-b-xl px-8 py-7">

            {loading && (
              <div className="text-center py-10">
                <Loader2 className="w-9 h-9 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-muted-foreground m-0">{estimate_view.loadingText}</p>
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-10">
                <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="text-foreground font-semibold mb-2">{estimate_view.notFoundTitle}</p>
                <p className="text-muted-foreground text-sm m-0">{error}</p>
              </div>
            )}

            {!loading && estimate && (
              <>
                {/* Summary */}
                <table className="w-full border-collapse mb-6">
                  <tbody>
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm w-40">{estimate_view.summaryLabels.estimateNumber}</td>
                      <td className="py-1.5 font-bold text-sm text-foreground">{estimate.estimateNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm">{estimate_view.summaryLabels.preparedFor}</td>
                      <td className="py-1.5 font-semibold text-sm text-foreground">{estimate.clientName}</td>
                    </tr>
                    {estimate.projectDescription && (
                      <tr>
                        <td className="py-1.5 text-muted-foreground text-sm">{estimate_view.summaryLabels.project}</td>
                        <td className="py-1.5 text-sm text-foreground">{estimate.projectDescription}</td>
                      </tr>
                    )}
                    {estimate.validUntil && (
                      <tr>
                        <td className="py-1.5 text-muted-foreground text-sm">{estimate_view.summaryLabels.validUntil}</td>
                        <td className="py-1.5 font-semibold text-sm text-foreground">{estimate.validUntil}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-1.5 text-muted-foreground text-sm">{estimate_view.summaryLabels.status}</td>
                      <td className="py-1.5">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={statusStyle(estimate.status)}
                        >
                          {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Line items */}
                {estimate.lineItems.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground border-b-2 border-primary pb-1.5 mb-3">{estimate_view.scopeHeading}</h3>
                    <table className="w-full border-collapse text-sm mb-5">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">{estimate_view.tableHeaders.description}</th>
                          <th className="px-2 py-1.5 text-center text-muted-foreground font-semibold">{estimate_view.tableHeaders.qty}</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{estimate_view.tableHeaders.unitPrice}</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{estimate_view.tableHeaders.total}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimate.lineItems.map(li => (
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
                        <td className="py-1 pr-3 text-muted-foreground">{estimate_view.totalsLabels.subtotal}</td>
                        <td className="py-1 text-right text-foreground">{fmtCur(estimate.subtotal)}</td>
                      </tr>
                      {Number(estimate.taxAmount) > 0 && (
                        <tr>
                          <td className="py-1 pr-3 text-muted-foreground">{estimate_view.totalsLabels.tax} ({estimate.taxRate}%)</td>
                          <td className="py-1 text-right text-foreground">{fmtCur(estimate.taxAmount)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-border">
                        <td className="pt-2 pr-3 font-bold text-base text-foreground">{estimate_view.totalsLabels.total}</td>
                        <td className="pt-2 text-right font-bold text-lg text-primary">{fmtCur(estimate.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {estimate.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 mb-6">
                    <strong className="text-foreground">{estimate_view.notesLabel}:</strong> {estimate.notes}
                  </p>
                )}

                {/* Accept button */}
                {accepted ? (
                  <div className="text-center py-5">
                    <CheckCircle className="w-10 h-10 text-[hsl(var(--success))] mx-auto mb-2.5" />
                    <p className="font-bold text-base text-[hsl(var(--success))] m-0">{estimate_view.acceptedTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1.5 mb-0">{estimate_view.acceptedMessage}</p>
                  </div>
                ) : estimate.status !== 'declined' && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => void handleAccept()}
                      disabled={accepting}
                      className="w-full max-w-xs bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] font-bold text-base py-3.5 px-10 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer border-0"
                    >
                      {accepting ? estimate_view.acceptingButton : estimate_view.acceptButton}
                    </button>
                    {acceptError && (
                      <p className="text-sm text-destructive mt-2.5 mb-0">{acceptError}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2.5 mb-0">
                      {estimate_view.acceptDisclaimer}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-center mt-5 text-xs text-muted-foreground">
            {estimate_view.companyFooter}
          </p>
        </div>
      </div>
    </>
  );
}
