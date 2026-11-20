import { Link } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { XCircle } from 'lucide-react';
import { checkout_cancel } from 'virtual:content';

export default function CheckoutCancel() {
  return (
    <>
      <Helmet>
        <title>{checkout_cancel.pageTitle}</title>
        <meta name="description" content="Your payment was cancelled. No charge was made. Return to your invoices or go back to the dashboard." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{checkout_cancel.heading}</h1>
          <p className="text-muted-foreground mb-8">
            {checkout_cancel.message}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/invoices"
              className="block w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {checkout_cancel.btnInvoices}
            </Link>
            <Link
              to="/"
              className="block w-full py-2.5 px-4 rounded-lg bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
            >
              {checkout_cancel.btnDashboard}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
