import { useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { HardHat, Mail, ArrowLeft } from 'lucide-react';
import { forgot_password } from 'virtual:content';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }),
        credentials: 'include',
      });
      setSent(true);
    } catch {
      setError(forgot_password.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{forgot_password.pageTitle}</title>
        <meta name="description" content="Reset your Dust to Done owner account password." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground font-[Barlow,sans-serif] tracking-tight">
              {forgot_password.brandName}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <Mail className="h-10 w-10 text-primary" />
              <h1 className="text-lg font-semibold text-card-foreground">{forgot_password.sentHeading}</h1>
              <p className="text-sm text-muted-foreground">{forgot_password.sentMessage}</p>
              <a
                href="/login"
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {forgot_password.backToLogin}
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold text-card-foreground">{forgot_password.cardHeading}</h1>
              </div>
              <p className="text-xs text-muted-foreground mb-6">{forgot_password.cardSubheading}</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                    {forgot_password.emailLabel}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={forgot_password.emailPlaceholder}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {loading ? forgot_password.loadingButton : forgot_password.submitButton}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a
                  href="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {forgot_password.backToLogin}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
