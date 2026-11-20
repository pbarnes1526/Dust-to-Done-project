import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen, Users, BarChart3, ChevronLeft, ChevronRight, Plus, Search, X, Save, Trash2, Phone, Mail, MapPin, AlertCircle, ArrowLeft, Wrench, Building2, DollarSign } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: number;
  name: string;
  trade: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

interface Expense {
  id: number;
  jobId: number;
  description: string;
  amount: string;
  expenseDate: string | null;
  category: string;
}

interface VendorDetail {
  vendor: Vendor;
  expenses: Expense[];
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

// ─── Trade categories ─────────────────────────────────────────────────────────

const TRADES = [
  'Plumbing', 'Electrical', 'HVAC', 'Tile & Flooring', 'Lumber & Framing',
  'Drywall', 'Paint & Finishes', 'Concrete & Masonry', 'Roofing', 'Insulation',
  'Cabinetry & Millwork', 'Landscaping', 'Demolition', 'General Labor', 'Other',
];

const TRADE_COLORS: Record<string, string> = {
  'Plumbing':             'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Electrical':           'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'HVAC':                 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Tile & Flooring':      'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Lumber & Framing':     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Drywall':              'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'Paint & Finishes':     'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'Concrete & Masonry':   'bg-stone-500/15 text-stone-400 border-stone-500/30',
  'Roofing':              'bg-red-500/15 text-red-400 border-red-500/30',
  'Insulation':           'bg-lime-500/15 text-lime-400 border-lime-500/30',
  'Cabinetry & Millwork': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Landscaping':          'bg-green-500/15 text-green-400 border-green-500/30',
  'Demolition':           'bg-red-700/15 text-red-500 border-red-700/30',
  'General Labor':        'bg-muted text-muted-foreground border-border',
  'Other':                'bg-muted text-muted-foreground border-border',
};

function TradeBadge({ trade }: { trade: string | null }) {
  if (!trade) return null;
  const color = TRADE_COLORS[trade] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      <Wrench className="w-3 h-3" />{trade}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | string) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Vendor Form ──────────────────────────────────────────────────────────────

interface VendorFormProps {
  initial?: Partial<Vendor>;
  onSave: (data: Omit<Vendor, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function VendorForm({ initial, onSave, onCancel, saving, error }: VendorFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [trade, setTrade] = useState(initial?.trade ?? '');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const inp = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const lbl = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        void onSave({ name, trade: trade || null, contactName: contactName || null, email: email || null, phone: phone || null, address: address || null, notes: notes || null });
      }}
      className="space-y-5"
    >
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={lbl}>Company / Vendor Name *</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Midwest Plumbing Supply" required />
        </div>
        <div>
          <label className={lbl}>Trade Category</label>
          <select className={inp} value={trade} onChange={e => setTrade(e.target.value)}>
            <option value="">— Select trade —</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Contact Name</label>
          <input className={inp} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Dave Kowalski" />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input className={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(317) 555-0000" />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input className={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@vendor.com" />
        </div>
        <div className="md:col-span-2">
          <label className={lbl}>Address</label>
          <input className={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State ZIP" />
        </div>
        <div className="md:col-span-2">
          <label className={lbl}>Notes</label>
          <textarea className={inp + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, discount info, specialties…" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Vendor'}
        </button>
      </div>
    </form>
  );
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

interface VendorCardProps {
  vendor: Vendor;
  totalSpend: number;
  onSelect: (v: Vendor) => void;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
}

function VendorCard({ vendor, totalSpend, onSelect, onEdit, onDelete }: VendorCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group cursor-pointer"
      onClick={() => onSelect(vendor)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>{vendor.name}</h3>
          {vendor.contactName && <p className="text-xs text-muted-foreground mt-0.5">{vendor.contactName}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(vendor)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(vendor)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mb-3"><TradeBadge trade={vendor.trade} /></div>
      <div className="space-y-1.5">
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="w-3 h-3 flex-shrink-0" />{vendor.phone}
          </a>
        )}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors truncate">
            <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{vendor.email}</span>
          </a>
        )}
        {vendor.address && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" /><span className="line-clamp-1">{vendor.address}</span>
          </div>
        )}
      </div>
      {totalSpend > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total spend</span>
          <span className="text-xs font-bold text-primary tabular-nums">{fmtCurrency(totalSpend)}</span>
        </div>
      )}
      {vendor.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">{vendor.notes}</p>}
    </motion.div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  detail: VendorDetail;
  onBack: () => void;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
}

function DetailPanel({ detail, onBack, onEdit, onDelete }: DetailPanelProps) {
  const { vendor, expenses } = detail;
  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <motion.div key={vendor.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to vendors
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{vendor.name}</h2>
            <TradeBadge trade={vendor.trade} />
          </div>
          {vendor.contactName && <p className="text-sm text-muted-foreground mt-1">{vendor.contactName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(vendor)}
            className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-border">
            Edit
          </button>
          <button onClick={() => onDelete(vendor)}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-red-500/30">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
          {vendor.phone
            ? <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"><Phone className="w-4 h-4 text-muted-foreground" />{vendor.phone}</a>
            : <p className="text-sm text-muted-foreground/50">No phone</p>}
          {vendor.email
            ? <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors truncate"><Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{vendor.email}</span></a>
            : <p className="text-sm text-muted-foreground/50">No email</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Address</p>
          {vendor.address
            ? <div className="flex items-start gap-2 text-sm text-foreground"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />{vendor.address}</div>
            : <p className="text-sm text-muted-foreground/50">No address</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Spend Summary</p>
          <p className="text-2xl font-extrabold text-primary tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmtCurrency(totalSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} on record</p>
        </div>
      </div>

      {vendor.notes && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-foreground">{vendor.notes}</p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" /> Linked Expenses
        </h3>
        {expenses.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No expenses linked to this vendor yet.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="col-span-4">Description</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-border">
              {expenses.map(exp => (
                <div key={exp.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center">
                  <div className="col-span-4 text-sm text-foreground truncate">{exp.description}</div>
                  <div className="col-span-3 text-xs text-muted-foreground capitalize">{exp.category}</div>
                  <div className="col-span-3 text-sm text-muted-foreground">{exp.expenseDate ? fmtDate(exp.expenseDate) : '—'}</div>
                  <div className="col-span-2 text-right text-sm font-bold text-foreground tabular-nums">{fmtCurrency(exp.amount)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-t border-border bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</span>
              <span className="text-sm font-extrabold text-primary tabular-nums">{fmtCurrency(totalSpend)}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [spendMap, setSpendMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<VendorDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors');
      const data = await res.json() as Vendor[];
      setVendors(data);
      const spendEntries = await Promise.all(
        data.map(async v => {
          const r = await fetch(`/api/vendors/${v.id}`);
          const d = await r.json() as VendorDetail;
          const total = d.expenses.reduce((s, e) => s + Number(e.amount), 0);
          return [v.id, total] as [number, number];
        })
      );
      setSpendMap(Object.fromEntries(spendEntries));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const filtered = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contactName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.trade ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTrade = filterTrade === 'all' || v.trade === filterTrade;
    return matchSearch && matchTrade;
  });

  const activeTrades = [...new Set(vendors.map(v => v.trade).filter(Boolean))] as string[];

  const handleSelect = async (v: Vendor) => {
    const res = await fetch(`/api/vendors/${v.id}`);
    const detail = await res.json() as VendorDetail;
    setSelectedDetail(detail);
    setShowForm(false);
    setEditingVendor(null);
  };

  const handleCreate = async (data: Omit<Vendor, 'id' | 'createdAt'>) => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create vendor');
      await fetchAll();
      setShowForm(false);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data: Omit<Vendor, 'id' | 'createdAt'>) => {
    if (!editingVendor) return;
    setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/vendors/${editingVendor.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update vendor');
      const updated = await res.json() as Vendor;
      setEditingVendor(null);
      if (selectedDetail?.vendor.id === updated.id) {
        const detail = await fetch(`/api/vendors/${updated.id}`);
        setSelectedDetail(await detail.json() as VendorDetail);
      }
      await fetchAll();
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (v: Vendor) => {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    await fetch(`/api/vendors/${v.id}`, { method: 'DELETE' });
    if (selectedDetail?.vendor.id === v.id) setSelectedDetail(null);
    await fetchAll();
  };

  const totalSpendAll = Object.values(spendMap).reduce((s, n) => s + n, 0);

  return (
    <>
      <Helmet>
        <title>Vendors – Dust to Done</title>
        <meta name="description" content="Manage your vendor and supplier contacts, trade categories, and linked job expenses." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>

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
              const active = id === 'vendors';
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

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card flex-shrink-0">
            <div>
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Vendors & Suppliers</h1>
              <p className="text-xs text-muted-foreground">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52" />
              </div>
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setEditingVendor(null); setSelectedDetail(null); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Vendor
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {!showForm && !editingVendor && !selectedDetail && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Vendors</p>
                  <p className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{vendors.length}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Trade Categories</p>
                  <p className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{activeTrades.length}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Total Spend (all vendors)</p>
                  <p className="text-lg font-extrabold text-primary tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmtCurrency(totalSpendAll)}</p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {showForm && !editingVendor && (
                <motion.div key="new-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Add Vendor</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <VendorForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
                </motion.div>
              )}

              {editingVendor && (
                <motion.div key="edit-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit {editingVendor.name}</h2>
                    <button onClick={() => setEditingVendor(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <VendorForm initial={editingVendor} onSave={handleUpdate} onCancel={() => setEditingVendor(null)} saving={saving} error={formError} />
                </motion.div>
              )}

              {selectedDetail && !editingVendor && !showForm && (
                <DetailPanel
                  key={`detail-${selectedDetail.vendor.id}`}
                  detail={selectedDetail}
                  onBack={() => setSelectedDetail(null)}
                  onEdit={v => { setEditingVendor(v); setFormError(null); setSelectedDetail(null); }}
                  onDelete={handleDelete}
                />
              )}

              {!showForm && !editingVendor && !selectedDetail && (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {activeTrades.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setFilterTrade('all')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterTrade === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        All
                      </button>
                      {activeTrades.sort().map(t => (
                        <button key={t} onClick={() => setFilterTrade(filterTrade === t ? 'all' : t)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterTrade === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-card border border-border rounded-lg animate-pulse" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{search || filterTrade !== 'all' ? 'No vendors match your filters.' : 'No vendors yet. Add your first supplier.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map(v => (
                        <VendorCard
                          key={v.id}
                          vendor={v}
                          totalSpend={spendMap[v.id] ?? 0}
                          onSelect={handleSelect}
                          onEdit={v2 => { setEditingVendor(v2); setFormError(null); setSelectedDetail(null); }}
                          onDelete={handleDelete}
                        />
                      ))}
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
