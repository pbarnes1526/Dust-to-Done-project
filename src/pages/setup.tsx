import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Helmet } from '@dr.pogodin/react-helmet';
import { HardHat, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { setup } from 'virtual:content';

export default function SetupPage() {
  const navigate = useNavigate();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d: { setupRequired: boolean }) => setSetupRequired(d.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || data.message || 'Setup failed.');
      } else {
        setDone(true);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (setupRequired === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!setupRequired) {
    return (
      <>
        <Helmet>
          <title>{setup.pageTitle}</title>
          <meta name="description" content="First-time owner account setup for Dust to Done." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-4">
          <ShieldCheck className="h-12 w-12 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{setup.alreadyDoneHeading}</h1>
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            {setup.alreadyDoneMessage}
          </p>
          <a
            href="/login"
            className="mt-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            {setup.alreadyDoneButton}
          </a>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <ShieldCheck className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{setup.successHeading}</h1>
        <p className="text-muted-foreground text-sm">{setup.successMessage}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{setup.pageTitle}</title>
        <meta name="description" content="First-time owner account setup for Dust to Done." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground font-[Barlow,sans-serif] tracking-tight">
              {setup.brandName}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-card-foreground">{setup.cardHeading}</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-6">{setup.cardSubheading}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                {setup.nameLabel}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={setup.namePlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                {setup.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={setup.emailPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                {setup.passwordLabel}
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
                {setup.confirmLabel}
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
              {loading ? setup.loadingButton : setup.submitButton}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
