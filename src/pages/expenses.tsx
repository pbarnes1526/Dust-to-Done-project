import { useState, useEffect, useCallback, useRef } from 'react';
import NotificationBell from '@/components/NotificationBell';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search, X, Save,
  Trash2, Upload, Image, AlertCircle, Filter, DollarSign, BookOpen, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: number;
  jobId: number | null;
  vendor: string;
  description: string;
  amount: string;
  category: 'materials' | 'labor' | 'equipment' | 'permits' | 'other';
  receiptUrl: string | null;
  expenseDate: string | null;
  createdAt: string;
}

interface ExpenseRow {
  expense: Expense;
  jobName: string | null;
}

interface Job { id: number; name: string; }

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
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
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

const CATEGORIES = ['materials', 'labor', 'equipment', 'permits', 'other'] as const;

const CAT_COLORS: Record<string, string> = {
  materials: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  labor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  equipment: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  permits: 'bg-green-500/15 text-green-400 border-green-500/30',
  other: 'bg-muted text-muted-foreground border-border',
};

function CatBadge({ cat }: { cat: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${CAT_COLORS[cat] ?? CAT_COLORS.other}`}>
      {cat}
    </span>
  );
}

// ─── Receipt Upload ───────────────────────────────────────────────────────────

interface ReceiptUploadProps {
  value: string;
  onChange: (url: string) => void;
}

function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Only images and PDFs are accepted');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/expenses/receipt-upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json() as { url: string };
      onChange(data.url);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group">
          {value.endsWith('.pdf') ? (
            <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3 text-sm text-foreground">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="truncate flex-1">Receipt PDF uploaded</span>
              <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={value} alt="Receipt" className="w-full max-h-40 object-contain bg-muted" />
              <button type="button" onClick={() => onChange('')}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors group"
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? 'Uploading…' : 'Drop receipt here or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground/60">JPG, PNG, WEBP, or PDF</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

interface ExpenseFormData {
  jobId: number | null;
  vendor: string;
  description: string;
  amount: string;
  category: Expense['category'];
  receiptUrl: string;
  expenseDate: string;
}

const EMPTY_FORM: ExpenseFormData = {
  jobId: null, vendor: '', description: '', amount: '', category: 'materials', receiptUrl: '', expenseDate: '',
};

interface ExpenseFormProps {
  initial?: Partial<ExpenseFormData>;
  jobs: Job[];
  onSave: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function ExpenseForm({ initial, jobs, onSave, onCancel, saving, error }: ExpenseFormProps) {
  const [form, setForm] = useState<ExpenseFormData>({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof ExpenseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={e => { e.preventDefault(); void onSave(form); }} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Link to Job (optional)</label>
          <select className={inputCls} value={form.jobId ?? ''} onChange={e => setForm(f => ({ ...f, jobId: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">— No job linked —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Vendor / Supplier *</label>
          <input className={inputCls} value={form.vendor} onChange={set('vendor')} placeholder="Home Depot" required />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Description *</label>
          <input className={inputCls} value={form.description} onChange={set('description')} placeholder="2x4 framing lumber – 200 pieces" required />
        </div>
        <div>
          <label className={labelCls}>Amount ($) *</label>
          <input className={inputCls} type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" required />
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input className={inputCls} type="date" value={form.expenseDate} onChange={set('expenseDate')} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Receipt</label>
          <ReceiptUpload value={form.receiptUrl} onChange={url => setForm(f => ({ ...f, receiptUrl: url }))} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
}

// ─── Receipt Viewer ───────────────────────────────────────────────────────────

function ReceiptViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full bg-card rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Receipt</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {url.endsWith('.pdf') ? (
          <iframe src={url} className="w-full h-96" title="Receipt PDF" />
        ) : (
          <img src={url} alt="Receipt" className="w-full max-h-[70vh] object-contain bg-muted" />
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, jobRes] = await Promise.all([fetch('/api/expenses'), fetch('/api/jobs')]);
      const [expData, jobData] = await Promise.all([expRes.json() as Promise<ExpenseRow[]>, jobRes.json() as Promise<Job[]>]);
      setRows(expData);
      setJobs(jobData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const filtered = rows.filter(({ expense: e, jobName }) => {
    const matchSearch = e.vendor.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (jobName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || e.category === filterCat;
    const matchJob = filterJob === 'all' || String(e.jobId) === filterJob;
    return matchSearch && matchCat && matchJob;
  });

  const totalFiltered = filtered.reduce((s, { expense: e }) => s + Number(e.amount), 0);

  const catTotals = rows.reduce<Record<string, number>>((acc, { expense: e }) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  const handleCreate = async (data: ExpenseFormData) => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create expense');
      await fetchAll();
      setShowForm(false);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data: ExpenseFormData) => {
    if (!editingExp) return;
    setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/expenses/${editingExp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update expense');
      await fetchAll();
      setEditingExp(null);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  return (
    <>
      <Helmet>
        <title>Expenses – Dust to Done</title>
        <meta name="description" content="Track job expenses by category, vendor, and project. Upload receipts and view totals per job." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {viewingReceipt && <ReceiptViewer url={viewingReceipt} onClose={() => setViewingReceipt(null)} />}

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
              const active = id === 'expenses';
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Expenses</h1>
              <p className="text-xs text-muted-foreground">{rows.length} total · {fmtCurrency(rows.reduce((s, { expense: e }) => s + Number(e.amount), 0))} all time</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52" />
              </div>
              <NotificationBell />
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setEditingExp(null); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Category summary cards */}
            {!showForm && !editingExp && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setFilterCat(f => f === cat ? 'all' : cat)}
                    className={`bg-card border rounded-lg p-3 text-left transition-all ${filterCat === cat ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}>
                    <p className="text-xs text-muted-foreground capitalize mb-1">{cat}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{fmtCurrency(catTotals[cat] ?? 0)}</p>
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* New form */}
              {showForm && !editingExp && (
                <motion.div key="new-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Log Expense</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <ExpenseForm jobs={jobs} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
                </motion.div>
              )}

              {/* Edit form */}
              {editingExp && (
                <motion.div key="edit-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit Expense</h2>
                    <button onClick={() => setEditingExp(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <ExpenseForm
                    initial={{ jobId: editingExp.jobId, vendor: editingExp.vendor, description: editingExp.description, amount: editingExp.amount, category: editingExp.category, receiptUrl: editingExp.receiptUrl ?? '', expenseDate: editingExp.expenseDate ?? '' }}
                    jobs={jobs} onSave={handleUpdate} onCancel={() => setEditingExp(null)} saving={saving} error={formError}
                  />
                </motion.div>
              )}

              {/* List */}
              {!showForm && !editingExp && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {/* Filters row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filter by job:</span>
                    </div>
                    <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
                      className="bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="all">All Jobs</option>
                      {jobs.map(j => <option key={j.id} value={String(j.id)}>{j.name}</option>)}
                    </select>
                    {(filterCat !== 'all' || filterJob !== 'all' || search) && (
                      <button onClick={() => { setFilterCat('all'); setFilterJob('all'); setSearch(''); }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors">Clear filters</button>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · <span className="font-semibold text-foreground">{fmtCurrency(totalFiltered)}</span>
                    </span>
                  </div>

                  {loading ? (
                    <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{search || filterCat !== 'all' || filterJob !== 'all' ? 'No expenses match your filters.' : 'No expenses yet. Log your first expense.'}</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-3">Vendor</div>
                        <div className="col-span-3">Description</div>
                        <div className="col-span-2">Job</div>
                        <div className="col-span-1">Category</div>
                        <div className="col-span-1 text-right">Amount</div>
                        <div className="col-span-1">Date</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      <div className="divide-y divide-border">
                        {filtered.map(({ expense: e, jobName }) => (
                          <div key={e.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/20 transition-colors">
                            <div className="col-span-3 text-sm font-semibold text-foreground truncate">{e.vendor}</div>
                            <div className="col-span-3 text-sm text-muted-foreground truncate">{e.description}</div>
                            <div className="col-span-2 text-xs text-muted-foreground truncate">{jobName ?? <span className="italic opacity-50">No job</span>}</div>
                            <div className="col-span-1"><CatBadge cat={e.category} /></div>
                            <div className="col-span-1 text-right text-sm font-bold text-foreground tabular-nums">{fmtCurrency(e.amount)}</div>
                            <div className="col-span-1 text-xs text-muted-foreground">{e.expenseDate ?? '—'}</div>
                            <div className="col-span-1 flex items-center justify-end gap-1">
                              {e.receiptUrl && (
                                <button onClick={() => setViewingReceipt(e.receiptUrl!)}
                                  className="text-muted-foreground hover:text-primary transition-colors p-1" title="View receipt">
                                  <Image className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => { setEditingExp(e); setFormError(null); }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Edit">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(e.id)}
                                className="text-muted-foreground hover:text-red-400 transition-colors p-1" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
