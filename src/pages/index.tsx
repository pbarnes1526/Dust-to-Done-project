import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, HardHat, Receipt, FileText, ClipboardList, FolderOpen, Users, BarChart3, Settings, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Search, Plus, BookOpen, DollarSign, Sparkles, Calendar, UserCheck, Package, FileSignature, RefreshCw,
} from 'lucide-react';
import { dashboard } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import { LogoutButton, useSession } from '@/lib/auth/auth-client';




const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', path: '/' },
  { icon: HardHat, label: 'Jobs & Projects', id: 'jobs', path: '/jobs' },
  { icon: Calendar, label: 'Job Calendar', id: 'calendar', path: '/calendar' },
  { icon: UserCheck, label: 'Employees', id: 'employees', path: '/employees' },
  { icon: Users, label: 'Customers', id: 'customers', path: '/customers' },
  { icon: ClipboardList, label: 'Estimates', id: 'estimates', path: '/estimates' },
  { icon: Receipt, label: 'Expenses', id: 'expenses', path: '/expenses' },
  { icon: FileText, label: 'Invoices', id: 'invoices', path: '/invoices' },
  { icon: DollarSign, label: 'Payments', id: 'payments', path: '/payments' },
  { icon: FileSignature, label: 'Contracts', id: 'contracts', path: '/contracts' },
  { icon: Package, label: 'Material Orders', id: 'material-orders', path: '/material-orders' },
  { icon: FolderOpen, label: 'Documents', id: 'documents', path: '/documents' },
  { icon: Users, label: 'Vendors', id: 'vendors', path: '/vendors' },
  { icon: BarChart3, label: 'Reports', id: 'reports', path: '/reports' },
  { icon: BookOpen, label: 'Price Library', id: 'price-library', path: '/price-library' },
  { icon: RefreshCw, label: 'Supplier Prices', id: 'supplier-pricing', path: '/supplier-pricing' },
  { icon: Sparkles, label: 'Scope Builder', id: 'scope', path: '/scope' },
  { icon: ClipboardList, label: 'AI Takeoff', id: 'takeoff', path: '/takeoff' },
  { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];



function fmt(n: number) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'in_progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'pending': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'completed': 'bg-green-500/15 text-green-400 border-green-500/30',
    'paid': 'bg-green-500/15 text-green-400 border-green-500/30',
    'sent': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'draft': 'bg-muted text-muted-foreground border-border',
    'overdue': 'bg-red-500/15 text-red-400 border-red-500/30',
    'cancelled': 'bg-muted text-muted-foreground border-border',
  };
  const label = (status ?? '').replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {label}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = pct > 90 ? 'bg-red-500' : pct > 65 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

interface Job { id: number; name: string; clientName: string; status: string; budget: string; }
interface Expense { id: number; vendor: string; description: string; amount: string; expenseDate: string | null; }
interface Invoice { id: number; invoiceNumber: string; clientName: string; total: string; status: string; dueDate: string | null; }
interface Payment { id: number; amount: string; paymentDate: string; method: string; referenceNumber: string | null; notes: string | null; jobId: number | null; invoiceId: number | null; }

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  delay: number;
}

function StatCard({ label, value, sub, trend, icon: Icon, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' as const }}
      className="relative bg-card border border-border rounded-lg p-5 overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-lg" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-foreground tabular-nums mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </div>
      <div className="flex items-center gap-1 text-xs">
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
        {trend === 'neutral' && <Clock className="w-3 h-3 text-muted-foreground" />}
        <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'}>
          {sub}
        </span>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState({ totalCollected: 0, monthCollected: 0, count: 0 });

  useEffect(() => {
    void fetch('/api/jobs').then(r => r.json()).then((d: Job[]) => setJobs(d)).catch(() => {});
    void fetch('/api/expenses').then(r => r.json()).then((d: Expense[]) => setExpenses(d)).catch(() => {});
    void fetch('/api/invoices').then(r => r.json()).then((d: unknown) => {
      if (!Array.isArray(d)) { setInvoices([]); return; }
      // API returns { invoice, jobName }[] — unwrap the invoice object from each row
      const unwrapped = (d as { invoice?: Invoice; id?: number }[]).map(row =>
        row.invoice ?? (row as unknown as Invoice)
      ).filter((inv): inv is Invoice => inv != null && typeof inv.id === 'number');
      setInvoices(unwrapped);
    }).catch(() => {});
    void fetch('/api/payments').then(r => r.json()).then((d: Payment[]) => setPayments(d)).catch(() => {});
    void fetch('/api/payments/summary').then(r => r.json()).then((d: { totalCollected: number; monthCollected: number; count: number }) => setPaymentSummary(d)).catch(() => {});
  }, []);

  // Computed stats from live data
  const activeJobCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const expensesMTD = expenses
    .filter(e => { if (!e.expenseDate) return false; const d = new Date(e.expenseDate); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const outstandingTotal = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total), 0);
  const outstandingCount = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;


  return (
    <>
      <Helmet>
        <title>{dashboard.metaTitle}</title>
        <meta name="description" content={dashboard.metaDescription} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.25, ease: 'easeInOut' as const }}
          className="flex-shrink-0 flex flex-col bg-card border-r border-border overflow-hidden"
        >
          <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <img src="/airo-assets/images/logo/horizontal" alt="Dust to Done" className="h-auto max-h-9 w-auto object-contain self-center flex-shrink-0" style={{maxWidth: '36px'}} />
                <span className="text-foreground font-semibold text-sm truncate" style={{fontFamily: 'var(--font-heading)'}}>{dashboard.companyName}</span>
              </div>
            ) : (
              <img src="/airo-assets/images/logo/primary" alt="Dust to Done" className="w-8 h-8 object-contain self-center" />
            )}
          </div>
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.map(({ icon: Icon, label, id, path }) => {
              const active = id === 'dashboard';
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-border p-3 flex-shrink-0 flex flex-col gap-1">
            {!collapsed && user && (
              <div className="px-1 pb-1 text-xs text-muted-foreground truncate">{user.email}</div>
            )}
            <LogoutButton className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors py-1.5 rounded hover:bg-destructive/10">
              {collapsed ? <span className="text-xs">↩</span> : <span>Sign Out</span>}
            </LogoutButton>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded hover:bg-muted/50"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>{dashboard.collapseLabel}</span></>}
            </button>
          </div>
        </motion.aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card flex-shrink-0">
            <div>
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{dashboard.pageTitle}</h1>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs, expenses…"
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
                />
              </div>
              <NotificationBell />
              <button onClick={() => navigate('/jobs', { state: { openCreate: true } })} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" />
                New Job
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <StatCard label="Active Jobs" value={String(activeJobCount)} sub={activeJobCount === 1 ? '1 active job' : `${activeJobCount} active jobs`} trend="neutral" icon={HardHat} delay={0} />
              <StatCard label="Expenses MTD" value={fmt(expensesMTD)} sub="month to date" trend="neutral" icon={Receipt} delay={0.08} />
              <StatCard label="Outstanding Invoices" value={fmt(outstandingTotal)} sub={outstandingCount === 1 ? '1 invoice open' : `${outstandingCount} invoices open`} trend="neutral" icon={FileText} delay={0.16} />
              <StatCard label="Revenue Collected" value={fmt(paymentSummary.monthCollected)} sub={`${paymentSummary.count} payment${paymentSummary.count !== 1 ? 's' : ''} total`} trend="up" icon={TrendingUp} delay={0.24} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Active Jobs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.32, ease: 'easeOut' as const }}
                className="lg:col-span-3 bg-card border border-border rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{dashboard.activeJobsHeading}</h2>
                  <button onClick={() => navigate('/jobs')} className="text-xs text-primary hover:underline font-medium">{dashboard.activeJobsViewAll}</button>
                </div>
                {jobs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">{dashboard.activeJobsEmpty}</div>
                ) : (
                  <div className="divide-y divide-border">
                    {jobs.filter(j => j.status !== 'completed').slice(0, 5).map((job) => (
                      <div key={job.id} onClick={() => navigate('/jobs')} className="px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{job.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.clientName}</p>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>
                        <ProgressBar value={0} max={Number(job.budget)} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <div className="lg:col-span-2 flex flex-col gap-4">

                {/* Recent Expenses */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' as const }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{dashboard.expensesHeading}</h2>
                    <button onClick={() => navigate('/expenses')} className="text-xs text-primary hover:underline font-medium">{dashboard.expensesViewAll}</button>
                  </div>
                  {expenses.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-muted-foreground">{dashboard.expensesEmpty}</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {expenses.slice(0, 4).map((exp) => (
                        <div key={exp.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{exp.vendor}</p>
                            <p className="text-xs text-muted-foreground truncate">{exp.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-foreground tabular-nums">{fmt(Number(exp.amount))}</p>
                            {exp.expenseDate && <p className="text-xs text-muted-foreground">{exp.expenseDate}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Invoices */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.48, ease: 'easeOut' as const }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{dashboard.invoicesHeading}</h2>
                    <button onClick={() => navigate('/invoices')} className="text-xs text-primary hover:underline font-medium">{dashboard.invoicesViewAll}</button>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-muted-foreground">{dashboard.invoicesEmpty}</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {invoices.slice(0, 4).map((inv) => (
                        <div key={inv.id} onClick={() => navigate('/invoices')} className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">{inv.clientName}</p>
                          </div>
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                            <p className="text-xs font-bold text-foreground tabular-nums">{fmt(Number(inv.total))}</p>
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Recent Payments */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.56, ease: 'easeOut' as const }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{dashboard.paymentsHeading}</h2>
                    <button onClick={() => navigate('/payments')} className="text-xs text-primary hover:underline font-medium">{dashboard.paymentsViewAll}</button>
                  </div>
                  {payments.length === 0 ? (
                    <div className="px-5 py-6 text-center text-sm text-muted-foreground">{dashboard.paymentsEmpty}</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {payments.slice(0, 4).map((pmt) => (
                        <div key={pmt.id} onClick={() => navigate('/payments')} className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground tabular-nums">{fmt(Number(pmt.amount))}</p>
                            <p className="text-xs text-muted-foreground">{pmt.paymentDate}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-primary/10 text-primary border-primary/30 capitalize">{pmt.method.replace('_', ' ')}</span>
                            {pmt.referenceNumber && <p className="text-xs text-muted-foreground mt-0.5">#{pmt.referenceNumber}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  );
}
