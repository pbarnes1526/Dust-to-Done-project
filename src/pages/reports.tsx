import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen, Users, BarChart3, ChevronLeft, ChevronRight, TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Minus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobCostReport {
  jobId: number;
  jobName: string;
  clientName: string;
  status: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  totalInvoiced: number;
  totalPaid: number;
  invoiceCount: number;
  totalEstimated: number;
  estimateCount: number;
  budgetUsedPct: number;
  grossProfit: number;
  grossMarginPct: number;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       id: 'dashboard', path: '/' },
  { icon: HardHat,         label: 'Jobs & Projects', id: 'jobs',      path: '/jobs' },
  { icon: ClipboardList,   label: 'Estimates',       id: 'estimates', path: '/estimates' },
  { icon: Receipt,         label: 'Expenses',        id: 'expenses',  path: '/expenses' },
  { icon: FileText,        label: 'Invoices',        id: 'invoices',  path: '/invoices' },
  { icon: DollarSign,      label: 'Payments',        id: 'payments',  path: '/payments' },
  { icon: FolderOpen,      label: 'Documents',       id: 'documents', path: '/documents' },
  { icon: Users,           label: 'Vendors',         id: 'vendors',   path: '/vendors' },
  { icon: BarChart3,       label: 'Reports',         id: 'reports',   path: '/reports' },
];

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials', labor: 'Labor', equipment: 'Equipment',
  permits: 'Permits', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  materials: 'bg-blue-500',
  labor: 'bg-amber-500',
  equipment: 'bg-purple-500',
  permits: 'bg-green-500',
  other: 'bg-slate-500',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: 'Pending',     color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',     icon: TrendingUp },
  completed:   { label: 'Completed',   color: 'text-green-400 bg-green-400/10 border-green-400/30',  icon: CheckCircle2 },
  on_hold:     { label: 'On Hold',     color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: AlertTriangle },
  cancelled:   { label: 'Cancelled',   color: 'text-red-400 bg-red-400/10 border-red-400/30',        icon: Minus },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// ─── Summary KPI strip ────────────────────────────────────────────────────────

function SummaryStrip({ reports }: { reports: JobCostReport[] }) {
  const totalBudget    = reports.reduce((s, r) => s + r.budget, 0);
  const totalExpenses  = reports.reduce((s, r) => s + r.totalExpenses, 0);
  const totalPaid      = reports.reduce((s, r) => s + r.totalPaid, 0);
  const totalProfit    = reports.reduce((s, r) => s + r.grossProfit, 0);
  const avgMargin      = reports.length ? reports.reduce((s, r) => s + r.grossMarginPct, 0) / reports.length : 0;
  const overBudget     = reports.filter(r => r.budget > 0 && r.totalExpenses > r.budget).length;

  const kpis = [
    { label: 'Total Budget',    value: fmt(totalBudget),   sub: `${reports.length} jobs`,           color: 'text-foreground' },
    { label: 'Total Expenses',  value: fmt(totalExpenses), sub: `${fmt(totalBudget - totalExpenses)} remaining`, color: totalExpenses > totalBudget ? 'text-red-400' : 'text-foreground' },
    { label: 'Revenue Collected', value: fmt(totalPaid),   sub: 'paid invoices',                     color: 'text-green-400' },
    { label: 'Gross Profit',    value: fmt(totalProfit),   sub: `avg ${avgMargin.toFixed(1)}% margin`, color: totalProfit >= 0 ? 'text-primary' : 'text-red-400' },
    { label: 'Over Budget',     value: String(overBudget), sub: 'jobs over budget',                  color: overBudget > 0 ? 'text-red-400' : 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
          <p className={`text-xl font-extrabold tabular-nums ${k.color}`} style={{ fontFamily: 'var(--font-heading)' }}>{k.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Category bar ─────────────────────────────────────────────────────────────

function CategoryBar({ byCategory, total }: { byCategory: Record<string, number>; total: number }) {
  const cats = Object.entries(byCategory).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (cats.length === 0) return <p className="text-xs text-muted-foreground">No expenses</p>;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {cats.map(([cat, val]) => (
          <div
            key={cat}
            className={`${CATEGORY_COLORS[cat] ?? 'bg-muted'} rounded-full`}
            style={{ width: `${clamp((val / total) * 100, 1, 100)}%` }}
            title={`${CATEGORY_LABELS[cat] ?? cat}: ${fmt(val)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {cats.map(([cat, val]) => (
          <span key={cat} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-muted'}`} />
            {CATEGORY_LABELS[cat] ?? cat} {fmt(val)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Budget progress bar ──────────────────────────────────────────────────────

function BudgetBar({ used, budget }: { used: number; budget: number }) {
  if (budget <= 0) return <p className="text-xs text-muted-foreground/50">No budget set</p>;
  const pct = clamp((used / budget) * 100, 0, 100);
  const over = used > budget;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Spent {fmt(used)}</span>
        <span className={`font-semibold ${over ? 'text-red-400' : 'text-muted-foreground'}`}>
          {over ? `${fmt(used - budget)} over` : `${fmt(budget - used)} left`}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Budget: {fmt(budget)}</p>
    </div>
  );
}

// ─── Job row (expandable) ─────────────────────────────────────────────────────

function JobRow({ report }: { report: JobCostReport }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG['pending'];
  const StatusIcon = cfg.icon;
  const profitPositive = report.grossProfit >= 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full grid grid-cols-12 gap-3 px-5 py-4 items-center text-left hover:bg-muted/20 transition-colors"
      >
        <div className="col-span-4 min-w-0">
          <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>{report.jobName}</p>
          <p className="text-xs text-muted-foreground truncate">{report.clientName}</p>
        </div>
        <div className="col-span-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
            <StatusIcon className="w-3 h-3" />{cfg.label}
          </span>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm font-bold text-foreground tabular-nums">{fmt(report.totalExpenses)}</p>
          <p className="text-xs text-muted-foreground">expenses</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm font-bold text-green-400 tabular-nums">{fmt(report.totalPaid)}</p>
          <p className="text-xs text-muted-foreground">collected</p>
        </div>
        <div className="col-span-1 text-right">
          <p className={`text-sm font-bold tabular-nums ${profitPositive ? 'text-primary' : 'text-red-400'}`}>{fmt(report.grossProfit)}</p>
          <p className={`text-xs ${profitPositive ? 'text-primary/70' : 'text-red-400/70'}`}>{fmtPct(report.grossMarginPct)}</p>
        </div>
        <div className="col-span-1 flex justify-end">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Budget vs Actual */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Budget vs Actual</p>
            <BudgetBar used={report.totalExpenses} budget={report.budget} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Estimated</p>
                <p className="font-bold text-foreground tabular-nums">{report.estimateCount > 0 ? fmt(report.totalEstimated) : '—'}</p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Invoiced</p>
                <p className="font-bold text-foreground tabular-nums">{report.invoiceCount > 0 ? fmt(report.totalInvoiced) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Expense breakdown */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Expense Breakdown</p>
            <CategoryBar byCategory={report.expensesByCategory} total={report.totalExpenses} />
            {Object.keys(report.expensesByCategory).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(report.expensesByCategory)
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(val)}</span>
                    </div>
                  ))}
                <div className="flex justify-between text-xs pt-1 border-t border-border">
                  <span className="font-bold text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground tabular-nums">{fmt(report.totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>

          {/* P&L summary */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Profit & Loss</p>
            <div className="space-y-2">
              {[
                { label: 'Revenue (paid)',  value: report.totalPaid,      color: 'text-green-400' },
                { label: 'Total Expenses',  value: -report.totalExpenses, color: 'text-red-400' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`font-semibold tabular-nums ${row.color}`}>{fmt(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="font-bold text-foreground">Gross Profit</span>
                <span className={`font-extrabold tabular-nums ${profitPositive ? 'text-primary' : 'text-red-400'}`}>{fmt(report.grossProfit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gross Margin</span>
                <span className={`font-semibold tabular-nums ${profitPositive ? 'text-primary/80' : 'text-red-400/80'}`}>{report.grossMarginPct.toFixed(1)}%</span>
              </div>
              {report.totalPaid < report.totalInvoiced && report.invoiceCount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {fmt(report.totalInvoiced - report.totalPaid)} outstanding
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'expenses' | 'profit' | 'margin' | 'budget';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [reports, setReports] = useState<JobCostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('expenses');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports');
        setReports(await res.json() as JobCostReport[]);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedFiltered = [...reports]
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name')     diff = a.jobName.localeCompare(b.jobName);
      if (sortKey === 'expenses') diff = a.totalExpenses - b.totalExpenses;
      if (sortKey === 'profit')   diff = a.grossProfit - b.grossProfit;
      if (sortKey === 'margin')   diff = a.grossMarginPct - b.grossMarginPct;
      if (sortKey === 'budget')   diff = a.budget - b.budget;
      return sortDir === 'asc' ? diff : -diff;
    });

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${sortKey === k ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      {label}
      {sortKey === k && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  );

  const statuses = [...new Set(reports.map(r => r.status))];

  return (
    <>
      <Helmet>
        <title>Reports – Dust to Done</title>
        <meta name="description" content="Job cost reports: budgeted vs actual spend, expense breakdown, invoice totals, and profit margin per job." />
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
            {!collapsed
              ? <div className="flex items-center gap-2 min-w-0">
                <img src="/airo-assets/images/logo/horizontal" alt="Dust to Done" className="h-auto max-h-9 w-auto object-contain self-center flex-shrink-0" style={{maxWidth: '36px'}} />
                <span className="text-foreground font-semibold text-sm truncate" style={{fontFamily: 'var(--font-heading)'}}>Dust to Done Renovation Solutions LLC</span>
              </div>
              : <img src="/airo-assets/images/logo/primary" alt="Dust to Done" className="w-8 h-8 object-contain self-center" />}
          </div>
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.map(({ icon: Icon, label, id, path }) => {
              const active = id === 'reports';
              return (
                <button key={id} onClick={() => navigate(path)}
                  className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-border p-3 flex-shrink-0">
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded hover:bg-muted/50">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
            </button>
          </div>
        </motion.aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card flex-shrink-0">
            <div>
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Job Cost Reports</h1>
              <p className="text-xs text-muted-foreground">{reports.length} jobs</p>
            </div>
            {/* Status filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <NotificationBell />
              <button onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                All
              </button>
              {statuses.map(s => {
                const cfg = STATUS_CONFIG[s];
                return cfg ? (
                  <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {cfg.label}
                  </button>
                ) : null;
              })}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <>
                <SummaryStrip reports={sortedFiltered} />

                {/* Table header */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border">
                    <div className="col-span-4"><SortBtn k="name" label="Job" /></div>
                    <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</div>
                    <div className="col-span-2 text-right"><SortBtn k="expenses" label="Expenses" /></div>
                    <div className="col-span-2 text-right"><SortBtn k="profit" label="Collected" /></div>
                    <div className="col-span-1 text-right"><SortBtn k="margin" label="P&L" /></div>
                    <div className="col-span-1" />
                  </div>

                  {sortedFiltered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No jobs match the current filter.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {sortedFiltered.map(r => <JobRow key={r.jobId} report={r} />)}
                    </div>
                  )}
                </div>

                {/* Portfolio P&L summary card */}
                {sortedFiltered.length > 0 && (() => {
                  const totalRevenue  = sortedFiltered.reduce((s, r) => s + r.totalPaid, 0);
                  const totalExpenses = sortedFiltered.reduce((s, r) => s + r.totalExpenses, 0);
                  const totalProfit   = totalRevenue - totalExpenses;
                  const margin        = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
                  const totalOutstanding = sortedFiltered.reduce((s, r) => s + Math.max(0, r.totalInvoiced - r.totalPaid), 0);
                  return (
                    <div className="bg-card border border-primary/20 rounded-lg p-5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Portfolio Summary
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                          <p className="text-lg font-extrabold text-green-400 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Expenses</p>
                          <p className="text-lg font-extrabold text-red-400 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalExpenses)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Gross Profit</p>
                          <p className={`text-lg font-extrabold tabular-nums ${totalProfit >= 0 ? 'text-primary' : 'text-red-400'}`} style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalProfit)}</p>
                          <p className={`text-xs ${totalProfit >= 0 ? 'text-primary/70' : 'text-red-400/70'}`}>{margin.toFixed(1)}% margin</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className={`text-lg font-extrabold tabular-nums ${totalOutstanding > 0 ? 'text-amber-400' : 'text-muted-foreground'}`} style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalOutstanding)}</p>
                          <p className="text-xs text-muted-foreground">unpaid invoices</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
