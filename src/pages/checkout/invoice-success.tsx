import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { invoice_success } from 'virtual:content';

interface SessionData {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  amountPaid: number; // cents
  paymentIntentId: string;
}

type Status = 'verifying' | 'success' | 'error';

export default function InvoicePaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<Status>('verifying');
  const [session, setSession] = useState<SessionData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No session ID found.');
      return;
    }

    async function verify() {
      try {
        // Single server-side call: validates with Stripe AND records the payment atomically.
        // The server checks payment_status === 'paid' before writing anything.
        const res = await fetch('/api/stripe/confirm-invoice-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json() as {
          ok?: boolean;
          invoiceId?: number;
          invoiceNumber?: string;
          clientName?: string;
          amountPaid?: number;
          paymentIntentId?: string;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          setStatus('error');
          setErrorMsg(data.error ?? 'Could not verify payment.');
          return;
        }

        setSession({
          invoiceId: data.invoiceId ?? 0,
          invoiceNumber: data.invoiceNumber ?? '',
          clientName: data.clientName ?? '',
          amountPaid: data.amountPaid ?? 0,
          paymentIntentId: data.paymentIntentId ?? '',
        });
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Unexpected error.');
      }
    }

    void verify();
  }, [sessionId]);

  const fmtCur = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <>
      <Helmet>
        <title>{invoice_success.metaTitle}</title>
        <meta name="description" content={invoice_success.metaTitle} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">

          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">{invoice_success.verifyingTitle}</h1>
              <p className="text-muted-foreground text-sm">{invoice_success.verifyingMessage}</p>
            </>
          )}

          {status === 'success' && session && (
            <>
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">{invoice_success.successTitle}</h1>
              <p className="text-muted-foreground text-sm mb-6">
                <span>{invoice_success.successMessage}</span>
              </p>

              <div className="bg-muted/40 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{invoice_success.labelInvoice}</span>
                  <span className="font-semibold">{session.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{invoice_success.labelAmountPaid}</span>
                  <span className="font-bold text-green-500">{fmtCur(session.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{invoice_success.labelReference}</span>
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{session.paymentIntentId}</span>
                </div>
              </div>

              <Link
                to={`/invoices/${session.invoiceId}`}
                className="inline-block w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {invoice_success.btnViewInvoice}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">{invoice_success.errorTitle}</h1>
              <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
              <Link
                to="/invoices"
                className="inline-block w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {invoice_success.btnBackToInvoices}
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
