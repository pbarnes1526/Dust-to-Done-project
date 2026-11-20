import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { signIn, useSession } from '@/lib/auth/auth-client';
import { Lock, Eye, EyeOff, HardHat } from 'lucide-react';
import { login } from 'virtual:content';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPending } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear error as soon as the user starts correcting their credentials
  function clearError() {
    if (error) setError('');
  }

  useEffect(() => {
    if (!isPending && isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isPending, navigate, location]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(login.errorInvalid);
      } else {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch {
      setError(login.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{login.pageTitle}</title>
        <meta name="description" content="Owner login for Dust to Done Renovation Solutions LLC private management portal." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground font-[Barlow,sans-serif] tracking-tight">
              {login.brandName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{login.brandTagline}</p>
        </div>

        <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-card-foreground">{login.cardHeading}</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                {login.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={login.emailPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                {login.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
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

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/40 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {loading ? login.loadingButton : login.submitButton}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {login.forgotPasswordLink}
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Private business management system. Unauthorized access is prohibited.
        </p>
      </div>
    </>
  );
}
