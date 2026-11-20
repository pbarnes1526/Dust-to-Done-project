import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { authClient } from '@/lib/auth/auth-client';
import { HardHat, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { reset_password } from 'virtual:content';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(reset_password.errorMismatch);
      return;
    }
    if (password.length < 8) {
      setError(reset_password.errorTooShort);
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError('Reset link is invalid or has expired. Please request a new one.');
      } else {
        setDone(true);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch {
      setError(reset_password.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <Helmet>
          <title>{reset_password.pageTitle}</title>
          <meta name="description" content="Set a new password for your Dust to Done owner account." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold text-foreground">{reset_password.invalidHeading}</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {reset_password.invalidMessage}
          </p>
          <a
            href="/forgot-password"
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            {reset_password.requestNewLink}
          </a>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <KeyRound className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{reset_password.successHeading}</h1>
        <p className="text-muted-foreground text-sm">{reset_password.successMessage}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{reset_password.pageTitle}</title>
        <meta name="description" content="Set a new password for your Dust to Done owner account." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground font-[Barlow,sans-serif] tracking-tight">
              {reset_password.brandName}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-card-foreground">{reset_password.cardHeading}</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                {reset_password.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-muted-foreground">
                {reset_password.confirmLabel}
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
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
              {loading ? reset_password.loadingButton : reset_password.submitButton}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
