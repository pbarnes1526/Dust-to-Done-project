import { useState, useEffect, useCallback } from 'react';
import JobProgressPanel from '@/components/job/JobProgressPanel';
import JobPhotosPanel from '@/components/job/JobPhotosPanel';
import JobChecklistPanel from '@/components/job/JobChecklistPanel';
import JobAssignmentsPanel from '@/components/job/JobAssignmentsPanel';
import JobSchedulesPanel from '@/components/job/JobSchedulesPanel';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { jobs as jobsContent } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard, HardHat, Receipt, FileText, ClipboardList, FolderOpen, Users, BarChart3, Settings,
  ChevronLeft, ChevronRight, Plus, Search, X, Save, Trash2, ArrowLeft,
  MapPin, Phone, Mail, Calendar, DollarSign, StickyNote, AlertCircle, BookOpen,
  Package, Pencil, Check, ChevronDown, ChevronUp, Loader2, Library, Sparkles, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: number;
  name: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  budget: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  scopeNotes: string | null;
  createdAt: string;
}

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
  { icon: Sparkles, label: 'AI Takeoff', id: 'takeoff', path: '/takeoff' },
  { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: string | null | undefined) {
  if (!n) return '—';
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  on_hold: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Job Form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', clientName: '', clientEmail: '', clientPhone: '', address: '', status: 'pending' as Job['status'], budget: '', startDate: '', endDate: '', notes: '', scopeNotes: '' };

interface JobFormProps {
  initial?: Partial<typeof EMPTY_FORM>;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

interface CustomerOption { id: number; name: string; email: string | null; phone: string | null; address: string | null; }

function JobForm({ initial, onSave, onCancel, saving, error }: JobFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then((data: CustomerOption[]) => setCustomers(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const c = customers.find(x => x.id === id);
    if (c) {
      setForm(f => ({
        ...f,
        clientName: c.name,
        clientEmail: c.email ?? '',
        clientPhone: c.phone ?? '',
        address: c.address ?? '',
      }));
    }
  };

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Job Name *</label>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Kitchen Remodel – Smith Residence" required />
        </div>
        {customers.length > 0 && (
          <div className="md:col-span-2">
            <label className={labelCls}>Select Existing Customer</label>
            <select className={inputCls} defaultValue="none" onChange={handleCustomerSelect}>
              <option value="none">— choose a customer to auto-fill —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Client Name *</label>
          <input className={inputCls} value={form.clientName} onChange={set('clientName')} placeholder="Jane Smith" required />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={set('status')}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Client Email</label>
          <input className={inputCls} type="email" value={form.clientEmail} onChange={set('clientEmail')} placeholder="jane@email.com" />
        </div>
        <div>
          <label className={labelCls}>Client Phone</label>
          <input className={inputCls} value={form.clientPhone} onChange={set('clientPhone')} placeholder="(317) 555-0100" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Job Address</label>
          <input className={inputCls} value={form.address} onChange={set('address')} placeholder="123 Main St, Indianapolis, IN 46201" />
        </div>
        <div>
          <label className={labelCls}>Budget ($)</label>
          <input className={inputCls} type="number" min="0" step="0.01" value={form.budget} onChange={set('budget')} placeholder="25000" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Start Date</label>
            <input className={inputCls} type="date" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input className={inputCls} type="date" value={form.endDate} onChange={set('endDate')} />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={form.notes} onChange={set('notes')} placeholder="Quick notes, reminders…" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Scope of Work / Project Notes</label>
          <textarea className={inputCls + ' resize-none'} rows={5} value={form.scopeNotes} onChange={set('scopeNotes')} placeholder="Paste AI-generated material lists, project descriptions, scope details, or special instructions here…" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Job'}
        </button>
      </div>
    </form>
  );
}

// ─── Materials Panel ─────────────────────────────────────────────────────────

function MaterialsPanel({ jobId, fmtCur }: { jobId: number; fmtCur: (n: number | string) => string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matsLoading, setMatsLoading] = useState(true);
  const [matForm, setMatForm] = useState<typeof EMPTY_MAT | null>(null);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [matSaving, setMatSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<{ id: number; name: string; description: string | null; unit: string | null; unitPrice: string; category: string | null; vendor: string | null }[]>([]);
  const [libSearch, setLibSearch] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/materials`)
      .then(r => r.json())
      .then((data: Material[]) => { if (Array.isArray(data)) setMaterials(data); })
      .catch(() => {})
      .finally(() => setMatsLoading(false));
  }, [jobId]);

  const loadLibrary = async () => {
    const data = await fetch('/api/price-library').then(r => r.json()) as typeof libraryItems;
    if (Array.isArray(data)) setLibraryItems(data);
    setShowLibrary(true);
  };

  const handleAddMat = async (data: typeof EMPTY_MAT) => {
    setMatSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const created = await res.json() as Material;
      setMaterials(m => [...m, created]);
      setMatForm(null);
    } catch { /* ignore */ }
    setMatSaving(false);
  };

  const handleUpdateMat = async (id: number, data: Partial<typeof EMPTY_MAT>) => {
    setMatSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json() as Material;
      setMaterials(m => m.map(x => x.id === id ? updated : x));
      setEditingMat(null);
    } catch { /* ignore */ }
    setMatSaving(false);
  };

  const handleDeleteMat = async (id: number) => {
    await fetch(`/api/jobs/${jobId}/materials/${id}`, { method: 'DELETE' });
    setMaterials(m => m.filter(x => x.id !== id));
  };

  const handleStatusCycle = (mat: Material) => {
    const next: Record<string, Material['status']> = { needed: 'ordered', ordered: 'received', received: 'needed' };
    void handleUpdateMat(mat.id, { status: next[mat.status] });
  };

  const addFromLibrary = async (item: typeof libraryItems[0]) => {
    await handleAddMat({ description: item.name, quantity: '1', unit: item.unit ?? 'ea', estimatedCost: item.unitPrice, status: 'needed', vendor: item.vendor ?? '', notes: item.description ?? '' });
    setShowLibrary(false);
    setLibSearch('');
  };

  const matTotal = materials.reduce((s, m) => s + (m.estimatedCost ? Number(m.quantity) * Number(m.estimatedCost) : 0), 0);
  const filteredLib = libraryItems.filter(i => !libSearch || i.name.toLowerCase().includes(libSearch.toLowerCase()) || (i.category ?? '').toLowerCase().includes(libSearch.toLowerCase()));

  const inputCls = 'w-full bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  const activeForm = editingMat
    ? { description: editingMat.description, quantity: editingMat.quantity, unit: editingMat.unit, estimatedCost: editingMat.estimatedCost ?? '', status: editingMat.status, vendor: editingMat.vendor ?? '', notes: editingMat.notes ?? '' }
    : matForm;

  const setActiveForm = (k: keyof typeof EMPTY_MAT, v: string) => {
    if (editingMat) setEditingMat(m => m ? { ...m, [k]: v } : m);
    else setMatForm(m => m ? { ...m, [k]: v } : m);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Package className="w-3.5 h-3.5" />Materials Checklist
          {materials.length > 0 && <span className="ml-1 text-foreground">({materials.length})</span>}
        </h3>
        <div className="flex items-center gap-2">
          {matTotal > 0 && <span className="text-xs font-bold text-primary">{fmtCur(matTotal)} est.</span>}
          <button onClick={() => void loadLibrary()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors">
            <Library className="w-3 h-3" /> From Library
          </button>
          <button onClick={() => { setMatForm({ ...EMPTY_MAT }); setEditingMat(null); }} className="flex items-center gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 rounded transition-colors font-semibold">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
      </div>

      {activeForm !== null && (
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Description *</label>
              <input className={inputCls} value={activeForm.description} onChange={e => setActiveForm('description', e.target.value)} placeholder="2x4 lumber, 8ft" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Qty</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={activeForm.quantity} onChange={e => setActiveForm('quantity', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit</label>
              <input className={inputCls} value={activeForm.unit} onChange={e => setActiveForm('unit', e.target.value)} placeholder="ea, lf, sf" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Est. Cost / Unit ($)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={activeForm.estimatedCost} onChange={e => setActiveForm('estimatedCost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
              <select className={inputCls} value={activeForm.status} onChange={e => setActiveForm('status', e.target.value)}>
                <option value="needed">Needed</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Vendor</label>
              <input className={inputCls} value={activeForm.vendor} onChange={e => setActiveForm('vendor', e.target.value)} placeholder="Home Depot, Lowe's" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editingMat ? void handleUpdateMat(editingMat.id, activeForm) : void handleAddMat(activeForm)}
              disabled={matSaving || !activeForm.description}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {matSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {editingMat ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setMatForm(null); setEditingMat(null); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showLibrary && (
        <div className="px-4 py-3 bg-muted/20 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Select from Price Library</p>
            <button onClick={() => { setShowLibrary(false); setLibSearch(''); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <input
            className="w-full bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-2"
            placeholder="Search library…"
            value={libSearch}
            onChange={e => setLibSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredLib.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No items found.</p>
            ) : filteredLib.map(item => (
              <button key={item.id} onClick={() => void addFromLibrary(item)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded hover:bg-muted/60 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.name}</p>
                  {item.category && <p className="text-xs text-muted-foreground capitalize">{item.category}</p>}
                </div>
                <span className="text-xs font-bold text-primary">{Number(item.unitPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {matsLoading ? (
          <div className="px-4 py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : materials.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No materials yet. Add items manually or import from your Price Library.
          </div>
        ) : materials.map(mat => (
          <div key={mat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
            <button onClick={() => handleStatusCycle(mat)} title="Click to cycle status"
              className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${STATUS_MAT_COLORS[mat.status]}`}>
              {mat.status.charAt(0).toUpperCase() + mat.status.slice(1)}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{mat.description}</p>
              <p className="text-xs text-muted-foreground">
                {mat.quantity} {mat.unit}
                {mat.estimatedCost ? ` · ${fmtCur(Number(mat.quantity) * Number(mat.estimatedCost))}` : ''}
                {mat.vendor ? ` · ${mat.vendor}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingMat(mat); setMatForm(null); }} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => void handleDeleteMat(mat.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {materials.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">{materials.length} item{materials.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-foreground">Est. Total: <span className="text-primary">{fmtCur(matTotal)}</span></span>
        </div>
      )}
    </div>
  );
}

// ─── Job Detail Panel ─────────────────────────────────────────────────────────

interface JobDetailProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

interface Material {
  id: number;
  jobId: number;
  description: string;
  quantity: string;
  unit: string;
  estimatedCost: string | null;
  status: 'needed' | 'ordered' | 'received';
  vendor: string | null;
  notes: string | null;
}

const EMPTY_MAT = { description: '', quantity: '1', unit: 'ea', estimatedCost: '', status: 'needed' as Material['status'], vendor: '', notes: '' };
const STATUS_MAT_COLORS: Record<string, string> = {
  needed: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  ordered: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  received: 'bg-green-500/15 text-green-400 border-green-500/30',
};

function JobDetail({ job, onEdit, onDelete, onBack }: JobDetailProps) {
  const navigate = useNavigate();
  const [jobPayments, setJobPayments] = useState<{ id: number; amount: string; paymentDate: string; method: string; referenceNumber: string | null; invoiceNumber?: string | null; invoiceId?: number | null }[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);

  // ── Scope notes ──
  const [scopeOpen, setScopeOpen] = useState(!!job.scopeNotes);
  const [scopeEdit, setScopeEdit] = useState(false);
  const [scopeText, setScopeText] = useState(job.scopeNotes ?? '');
  const [scopeSaving, setScopeSaving] = useState(false);

  const handleSaveScope = async () => {
    setScopeSaving(true);
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...job, scopeNotes: scopeText }),
      });
      setScopeEdit(false);
    } catch { /* ignore */ }
    setScopeSaving(false);
  };

  useEffect(() => {
    fetch(`/api/payments?jobId=${job.id}`)
      .then(r => r.json())
      .then((data: { id: number; amount: string; paymentDate: string; method: string; referenceNumber: string | null; invoiceNumber?: string | null; invoiceId?: number | null }[]) => {
        if (Array.isArray(data)) {
          setJobPayments(data);
          setPaymentsTotal(data.reduce((s, p) => s + Number(p.amount), 0));
        }
      })
      .catch(() => {});
  }, [job.id]);

  function fmtDate(d: string) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtCur(n: number | string) {
    return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to jobs
          </button>
          <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{job.name}</h2>
          <div className="mt-1"><StatusBadge status={job.status} /></div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onEdit} className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-border">
            Edit Job
          </button>
          <button onClick={onDelete} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-red-500/30">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Client Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm"><span className="font-semibold text-foreground">{job.clientName}</span></div>
            {job.clientEmail && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{job.clientEmail}</div>}
            {job.clientPhone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{job.clientPhone}</div>}
            {job.address && <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{job.address}</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Job Details</h3>
          <div className="space-y-2">
            {job.budget && <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="w-3.5 h-3.5" />Budget: <span className="text-foreground font-semibold">{fmt(job.budget)}</span></div>}
            {job.startDate && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Start: <span className="text-foreground">{job.startDate}</span></div>}
            {job.endDate && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Due: <span className="text-foreground">{job.endDate}</span></div>}
          </div>
        </div>
      </div>

      {job.notes && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2"><StickyNote className="w-3.5 h-3.5" />Notes</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* ── Scope of Work ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setScopeOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2"><StickyNote className="w-3.5 h-3.5" />Scope of Work / Project Notes</span>
          {scopeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {scopeOpen && (
          <div className="px-4 pb-4 border-t border-border">
            {scopeEdit ? (
              <div className="pt-3 space-y-2">
                <textarea
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={8}
                  value={scopeText}
                  onChange={e => setScopeText(e.target.value)}
                  placeholder="Paste AI-generated material lists, project descriptions, scope details, or special instructions here…"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSaveScope()}
                    disabled={scopeSaving}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    {scopeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {scopeSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setScopeEdit(false); setScopeText(job.scopeNotes ?? ''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="pt-3">
                {scopeText ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{scopeText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No scope notes yet. Click Edit to add project details or paste an AI-generated material list.</p>
                )}
                <button onClick={() => setScopeEdit(true)} className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Pencil className="w-3 h-3" /> Edit scope notes
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Materials Checklist ── */}
      <MaterialsPanel jobId={job.id} fmtCur={fmtCur} />

      {/* ── Project Progress ── */}
      <JobProgressPanel jobId={job.id} />

      {/* ── Assigned Workers ── */}
      <JobAssignmentsPanel jobId={job.id} />

      {/* ── Job Photos ── */}
      <JobPhotosPanel jobId={job.id} />

      {/* ── Completion Checklist ── */}
      <JobChecklistPanel jobId={job.id} />

      {/* ── Daily Work Schedules ── */}
      <JobSchedulesPanel jobId={job.id} jobName={job.name} clientName={job.clientName} address={job.address ?? undefined} />

      {/* ── Payments Panel ── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" />Payments Received
          </h3>
          <div className="flex items-center gap-3">
            {paymentsTotal > 0 && <span className="text-sm font-bold text-green-400">{fmtCur(paymentsTotal)}</span>}
            <button onClick={() => navigate('/payments')} className="text-xs text-primary hover:underline">Manage →</button>
          </div>
        </div>
        {jobPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No payments recorded for this job.</p>
        ) : (
          <div className="space-y-2">
            {jobPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{fmtDate(p.paymentDate)}</span>
                  <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded-full">{p.method}</span>
                  {p.referenceNumber && <span className="text-xs text-muted-foreground">#{p.referenceNumber}</span>}
                </div>
                <span className="font-semibold text-green-400">{fmtCur(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();

  const [collapsed, setCollapsed] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json() as Job[];
      setJobs(data);
      // If jobId in URL, select that job
      if (jobId) {
        const found = data.find(j => j.id === Number(jobId));
        if (found) setSelectedJob(found);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  // Auto-open create form when navigated here with { state: { openCreate: true } }
  const location = useLocation();
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setShowForm(true);
      setEditingJob(null);
      setSelectedJob(null);
      setFormError(null);
      // Clear the state so a back-navigation doesn't re-open the form
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const filtered = jobs.filter(j =>
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: typeof EMPTY_FORM) => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create job');
      await fetchJobs();
      setShowForm(false);
    } catch (e) {
      setFormError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: typeof EMPTY_FORM) => {
    if (!editingJob) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update job');
      const updated = await res.json() as Job;
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
      setSelectedJob(updated);
      setEditingJob(null);
    } catch (e) {
      setFormError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (job: Job) => {
    if (!confirm(`Delete "${job.name}"? This cannot be undone.`)) return;
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    setSelectedJob(null);
    navigate('/jobs');
    await fetchJobs();
  };

  const openDetail = (job: Job) => {
    setSelectedJob(job);
    navigate(`/jobs/${job.id}`);
  };

  return (
    <>
      <Helmet>
        <title>{jobsContent.pageTitle} – Dust to Done</title>
        <meta name="description" content={jobsContent.pageDescription} />
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
                <span className="text-foreground font-semibold text-sm truncate" style={{fontFamily: 'var(--font-heading)'}}>Dust to Done Renovation Solutions LLC</span>
              </div>
            ) : (
              <img src="/airo-assets/images/logo/primary" alt="Dust to Done" className="w-8 h-8 object-contain self-center" />
            )}
          </div>
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.map(({ icon: Icon, label, id, path }) => {
              const active = id === 'jobs';
              return (
                <button key={id} onClick={() => navigate(path)}
                  className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Jobs & Projects</h1>
              <p className="text-xs text-muted-foreground">{jobs.length} total jobs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52"
                />
              </div>
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setEditingJob(null); setSelectedJob(null); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Job
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* New Job Form */}
              {showForm && !editingJob && (
                <motion.div key="new-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>New Job</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <JobForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
                </motion.div>
              )}

              {/* Edit Form */}
              {editingJob && (
                <motion.div key="edit-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit Job</h2>
                    <button onClick={() => setEditingJob(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <JobForm
                    initial={{ name: editingJob.name, clientName: editingJob.clientName, clientEmail: editingJob.clientEmail ?? '', clientPhone: editingJob.clientPhone ?? '', address: editingJob.address ?? '', status: editingJob.status, budget: editingJob.budget ?? '', startDate: editingJob.startDate ?? '', endDate: editingJob.endDate ?? '', notes: editingJob.notes ?? '', scopeNotes: editingJob.scopeNotes ?? '' }}
                    onSave={handleUpdate} onCancel={() => setEditingJob(null)} saving={saving} error={formError}
                  />
                </motion.div>
              )}

              {/* Detail View */}
              {selectedJob && !editingJob && !showForm && (
                <motion.div key={`detail-${selectedJob.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <JobDetail
                    job={selectedJob}
                    onEdit={() => setEditingJob(selectedJob)}
                    onDelete={() => handleDelete(selectedJob)}
                    onBack={() => { setSelectedJob(null); navigate('/jobs'); }}
                  />
                </motion.div>
              )}

              {/* Jobs List */}
              {!selectedJob && !showForm && !editingJob && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{search ? 'No jobs match your search.' : 'No jobs yet. Create your first job.'}</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-4">Job</div>
                        <div className="col-span-2">Client</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Budget</div>
                        <div className="col-span-2">Due Date</div>
                      </div>
                      <div className="divide-y divide-border">
                        {filtered.map(job => (
                          <div key={job.id} onClick={() => openDetail(job)}
                            className="grid grid-cols-12 gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center">
                            <div className="col-span-4 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{job.name}</p>
                              {job.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{job.address}</p>}
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground truncate">{job.clientName}</div>
                            <div className="col-span-2"><StatusBadge status={job.status} /></div>
                            <div className="col-span-2 text-sm text-foreground tabular-nums">{fmt(job.budget)}</div>
                            <div className="col-span-2 text-sm text-muted-foreground">{job.endDate ?? '—'}</div>
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
