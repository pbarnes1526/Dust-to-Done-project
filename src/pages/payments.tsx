import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search, X,
  Save, Trash2, DollarSign, BookOpen, CreditCard, Banknote, ArrowLeftRight,
  CheckSquare, Wallet, RefreshCw,
} from 'lucide-react';
import { payments as content } from 'virtual:content';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'cash' | 'check' | 'card' | 'transfer' | 'other';

interface Payment {
  id: number;
  jobId: number | null;
  invoiceId: number | null;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  jobName?: string | null;
  invoiceNumber?: string | null;
}

interface Job { id: number; name: string; clientName: string; }
interface Invoice { id: number; invoiceNumber: string; clientName: string; total: string; status: string; }

interface Summary {
  totalCollected: number;
  monthCollected: number;
  count: number;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', path: '/' },
  { icon: HardHat, label: 'Jobs & Projects', id: 'jobs', path: '/jobs' },
  { icon: ClipboardList, label: 'Estimates', id: 'estimates', path: '/estimates' },
  { icon: Receipt, label: 'Expenses', id: 'expenses', path: '/expenses' },
  { icon: FileText, label: 'Invoices', id: 'invoices', path: '/invoices' },
  { icon: DollarSign, label: 'Payments', id: 'payments', path: '/payments' },
  { icon: FolderOpen, label: 'Documents', id: 'documents', path: '/documents' },
  { icon: Users, label: 'Vendors', id: 'vendors', path: '/vendors' },
  { icon: BarChart3, label: 'Reports', id: 'reports', path: '/reports' },
  { icon: BookOpen, label: 'Price Library', id: 'price-library', path: '/price-library' },
  { icon: RefreshCw, label: 'Supplier Prices', id: 'supplier-pricing', path: '/supplier-pricing' },
  { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | string) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:     <Banknote className="w-3.5 h-3.5" />,
  check:    <CheckSquare className="w-3.5 h-3.5" />,
  card:     <CreditCard className="w-3.5 h-3.5" />,
  transfer: <ArrowLeftRight className="w-3.5 h-3.5" />,
  other:    <Wallet className="w-3.5 h-3.5" />,
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash:     'bg-green-500/15 text-green-400',
  check:    'bg-blue-500/15 text-blue-400',
  card:     'bg-purple-500/15 text-purple-400',
  transfer: 'bg-amber-500/15 text-amber-400',
  other:    'bg-muted text-muted-foreground',
};

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    jobId: '',
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    method: 'check' as PaymentMethod,
    referenceNumber: '',
    notes: '',
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [rows, setRows] = useState<Payment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCollected: 0, monthCollected: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes, iRes, sRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/jobs'),
        fetch('/api/invoices'),
        fetch('/api/payments/summary'),
      ]);
      const [pData, jData, iData, sData] = await Promise.all([pRes.json(), jRes.json(), iRes.json(), sRes.json()]);
      setRows(Array.isArray(pData) ? pData : []);
      setJobs(Array.isArray(jData) ? jData : []);
      // API returns { invoice: {...}, jobName } — unwrap and filter to unpaid only
      const allInvoices: Invoice[] = Array.isArray(iData)
        ? iData.map((row: { invoice: Invoice }) => row.invoice).filter(
            (inv: Invoice) => inv.status !== 'paid' && inv.status !== 'cancelled'
          )
        : [];
      setInvoiceList(allInvoices);
      setSummary(sData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingPayment(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  }

  function openEdit(p: Payment) {
    setEditingPayment(p);
    setForm({
      jobId: p.jobId ? String(p.jobId) : '',
      invoiceId: p.invoiceId ? String(p.invoiceId) : '',
      amount: p.amount,
      paymentDate: p.paymentDate,
      method: p.method,
      referenceNumber: p.referenceNumber ?? '',
      notes: p.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.amount || !form.paymentDate) {
      setFormError('Amount and date are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = {
        jobId: form.jobId || null,
        invoiceId: form.invoiceId || null,
        amount: form.amount,
        paymentDate: form.paymentDate,
        method: form.method,
        referenceNumber: form.referenceNumber || null,
        notes: form.notes || null,
      };
      const url = editingPayment ? `/api/payments/${editingPayment.id}` : '/api/payments';
      const method = editingPayment ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  }

  const filtered = rows.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.jobName ?? '').toLowerCase().includes(q) ||
      (p.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (p.referenceNumber ?? '').toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      p.paymentDate.includes(q)
    );
  });

  return (
    <>
      <Helmet>
        <title>Payments – Dust to Done</title>
        <meta name="description" content={content.pageDescription} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>

        {/* ── Sidebar ── */}
        <motion.aside
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.25, ease: 'easeInOut' as const }}
          className="flex-shrink-0 flex flex-col bg-card border-r border-border overflow-hidden"
        >
          <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
            {!collapsed
              ? <div className="flex items-center gap-2 min-w-0">
                  <img src="/airo-assets/images/logo/horizontal" alt="Dust to Done" className="h-auto max-h-9 w-auto object-contain self-center flex-shrink-0" style={{ maxWidth: '36px' }} />
                  <span className="text-foreground font-semibold text-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>Dust to Done</span>
                </div>
              : <img src="/airo-assets/images/logo/horizontal" alt="D2D" className="h-auto max-h-8 w-auto object-contain mx-auto" style={{ maxWidth: '32px' }} />
            }
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {navItems.map(({ icon: Icon, label, id, path }) => {
              const active = id === 'payments';
              return (
                <button key={id} onClick={() => navigate(path)}
                  className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
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

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header bar */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
            <h1 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{content.pageTitle}</h1>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">

            {/* KPI strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: content.kpi.totalCollectedLabel, value: fmtCurrency(summary.totalCollected), icon: DollarSign, color: 'text-green-400' },
                { label: content.kpi.thisMonthLabel, value: fmtCurrency(summary.monthCollected), icon: CreditCard, color: 'text-primary' },
                { label: content.kpi.paymentCountLabel, value: String(summary.count), icon: CheckSquare, color: 'text-blue-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search payments…"
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-3">
                <DollarSign className="w-8 h-8 opacity-30" />
                <span>{content.empty}</span>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.dateCol}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.amountCol}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.methodCol}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.jobCol}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.invoiceCol}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{content.table.referenceCol}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.paymentDate)}</td>
                        <td className="px-4 py-3 font-semibold text-green-400">{fmtCurrency(p.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_COLORS[p.method]}`}>
                            {METHOD_ICONS[p.method]}
                            <span>{p.method === 'cash' ? content.methodCash : p.method === 'check' ? content.methodCheck : p.method === 'card' ? content.methodCard : p.method === 'transfer' ? content.methodTransfer : content.methodOther}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.jobName
                            ? <button onClick={() => navigate(`/jobs/${p.jobId}`)} className="text-primary hover:underline">{p.jobName}</button>
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.invoiceNumber
                            ? <button onClick={() => navigate(`/invoices/${p.invoiceId}`)} className="text-primary hover:underline">{p.invoiceNumber}</button>
                            : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{p.referenceNumber || <span className="opacity-40">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {editingPayment ? content.form.editTitle : content.form.addTitle}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.amountLabel} *</label>
                    <input type="number" step="0.01" min="0"
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.dateLabel} *</label>
                    <input type="date"
                      value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                {/* Method */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.methodLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {(['cash', 'check', 'card', 'transfer', 'other'] as PaymentMethod[]).map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, method: m }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.method === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                        {METHOD_ICONS[m]}
                        <span>{m === 'cash' ? content.methodCash : m === 'check' ? content.methodCheck : m === 'card' ? content.methodCard : m === 'transfer' ? content.methodTransfer : content.methodOther}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.referenceLabel}</label>
                  <input type="text"
                    value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Check #, transaction ID…" />
                </div>

                {/* Job link */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.jobLabel}</label>
                  <select value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">— None —</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name} ({j.clientName})</option>)}
                  </select>
                </div>

                {/* Invoice link */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.invoiceLabel}</label>
                  <select value={form.invoiceId} onChange={e => {
                    const selectedId = e.target.value;
                    const selectedInv = invoiceList.find(inv => String(inv.id) === selectedId);
                    setForm(f => ({
                      ...f,
                      invoiceId: selectedId,
                      // Auto-fill amount from invoice total if amount not yet entered
                      amount: selectedInv && !f.amount ? selectedInv.total : f.amount,
                    }));
                  }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">— None —</option>
                    {invoiceList.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} – {inv.clientName} ({fmtCurrency(inv.total)})</option>)}
                  </select>
                  {invoiceList.length === 0 && <p className="text-xs text-muted-foreground mt-1">No unpaid invoices found.</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{content.form.notesLabel}</label>
                  <textarea rows={2}
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Optional notes…" />
                </div>

                {formError && <p className="text-destructive text-xs">{formError}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving…' : content.form.saveButton}</span>
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {content.form.cancelButton}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteId !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-semibold mb-2">Delete Payment?</h3>
              <p className="text-sm text-muted-foreground mb-5">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteId)}
                  className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors">
                  Delete
                </button>
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 border border-border py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
