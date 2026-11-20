import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, FileText, ClipboardList, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search, X,
  Save, Trash2, BookOpen, Upload, AlertCircle, CheckCircle2, Pencil,
  DollarSign, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unitPrice: string;
  vendor: string | null;
  sku: string | null;
  notes: string | null;
  createdAt: string;
}

type Category = 'all' | 'materials' | 'labor' | 'equipment' | 'permits' | 'other';

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'all',       label: 'All',       color: 'bg-muted text-muted-foreground border-border' },
  { value: 'materials', label: 'Materials', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'labor',     label: 'Labor',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'equipment', label: 'Equipment', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'permits',   label: 'Permits',   color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'other',     label: 'Other',     color: 'bg-muted text-muted-foreground border-border' },
];

const UNITS = ['ea', 'hr', 'sq ft', 'lin ft', 'cu yd', 'bag', 'gal', 'lb', 'ton', 'day', 'job', 'sheet', 'roll', 'box'];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',      id: 'dashboard',     path: '/' },
  { icon: HardHat,         label: 'Jobs & Projects', id: 'jobs',          path: '/jobs' },
  { icon: ClipboardList,   label: 'Estimates',       id: 'estimates',     path: '/estimates' },
  { icon: Receipt,         label: 'Expenses',        id: 'expenses',      path: '/expenses' },
  { icon: FileText,        label: 'Invoices',        id: 'invoices',      path: '/invoices' },
  { icon: DollarSign,      label: 'Payments',        id: 'payments',  path: '/payments' },
  { icon: FolderOpen,      label: 'Documents',       id: 'documents',     path: '/documents' },
  { icon: Users,           label: 'Vendors',         id: 'vendors',       path: '/vendors' },
  { icon: BarChart3,       label: 'Reports',         id: 'reports',       path: '/reports' },
  { icon: BookOpen,        label: 'Price Library',   id: 'price-library', path: '/price-library' },
  { icon: RefreshCw,       label: 'Supplier Prices', id: 'supplier-pricing', path: '/supplier-pricing' },
  { icon: Settings,        label: 'Settings',        id: 'settings',      path: '/settings' },
];

function fmtCurrency(n: number | string) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function catColor(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? CATEGORIES[0].color;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface CsvRow { name: string; description?: string; category?: string; unit?: string; unitPrice: string; vendor?: string; sku?: string; notes?: string; }

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return {
      name: row['name'] || row['item'] || row['description'] || '',
      description: row['description'] || row['desc'] || '',
      category: row['category'] || row['cat'] || 'materials',
      unit: row['unit'] || row['uom'] || 'ea',
      unitPrice: row['unitprice'] || row['price'] || row['cost'] || row['rate'] || '0',
      vendor: row['vendor'] || row['supplier'] || '',
      sku: row['sku'] || row['partnumber'] || row['part'] || '',
      notes: row['notes'] || row['note'] || '',
    } as CsvRow;
  }).filter(r => r.name && r.unitPrice && !isNaN(parseFloat(r.unitPrice)));
}

// ─── Empty Form ───────────────────────────────────────────────────────────────

const emptyForm = () => ({ name: '', description: '', category: 'materials', unit: 'ea', unitPrice: '', vendor: '', sku: '', notes: '' });

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PriceLibraryPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PriceItem | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    void fetch(`/api/price-library?${params}`)
      .then(r => r.json())
      .then((d: PriceItem[]) => setItems(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditItem(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(item: PriceItem) {
    setEditItem(item);
    setForm({ name: item.name, description: item.description ?? '', category: item.category, unit: item.unit, unitPrice: item.unitPrice, vendor: item.vendor ?? '', sku: item.sku ?? '', notes: item.notes ?? '' });
    setShowModal(true);
  }

  async function saveItem() {
    if (!form.name || !form.unitPrice) return;
    setSaving(true);
    try {
      const url = editItem ? `/api/price-library/${editItem.id}` : '/api/price-library';
      const method = editItem ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setShowModal(false);
      load();
    } finally { setSaving(false); }
  }

  async function deleteItem(id: number) {
    await fetch(`/api/price-library/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  }

  function handleCsvChange(text: string) {
    setCsvText(text);
    setCsvPreview(parseCsv(text));
    setImportStatus(null);
  }

  async function doImport() {
    if (!csvPreview.length) return;
    setImporting(true);
    try {
      const r = await fetch('/api/price-library/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: csvPreview }) });
      const d = await r.json() as { imported?: number; error?: string };
      if (r.ok) {
        setImportStatus({ ok: true, msg: `Imported ${d.imported} items successfully.` });
        setCsvText(''); setCsvPreview([]);
        load();
      } else {
        setImportStatus({ ok: false, msg: d.error ?? 'Import failed' });
      }
    } finally { setImporting(false); }
  }

  const activeNav = 'price-library';

  return (
    <>
      <Helmet>
        <title>Price Library – Dust to Done</title>
        <meta name="description" content="Manage your material and labor price library for fast estimate line item entry." />
      </Helmet>

      <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
        {/* Sidebar */}
        <aside className={`flex flex-col border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} flex-shrink-0`} style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between px-3 py-4 border-b border-border">
            {!collapsed && <span className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>Dust to Done</span>}
            <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground ml-auto">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          <nav className="flex-1 py-2 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = item.id === activeNav;
              return (
                <button key={item.id} onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${active ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0" style={{ background: 'hsl(var(--card))' }}>
            <div>
              <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Price Library</h1>
              <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button onClick={() => { setShowImport(true); setImportStatus(null); setCsvText(''); setCsvPreview([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </header>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap flex-shrink-0" style={{ background: 'hsl(var(--card))' }}>
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${category === c.value ? c.color : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading…</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No items yet. Add your first item or import a CSV.</p>
                <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border" style={{ background: 'hsl(var(--card))' }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Vendor</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">SKU</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Unit</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <motion.tr key={item.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors" style={{ background: 'hsl(var(--card))' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${catColor(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{item.vendor || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{item.sku || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{fmtCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border border-border shadow-xl overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{editItem ? 'Edit Item' : 'Add Price Item'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Item Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2x4x8 Framing Lumber"
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional detail"
                    className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      {CATEGORIES.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Price *</label>
                    <input type="number" step="0.01" min="0" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Vendor / Store</label>
                    <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Menards"
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">SKU / Part #</label>
                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional"
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional"
                      className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
                <button onClick={() => setShowModal(false)} className="px-3 py-1.5 rounded text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Cancel</button>
                <button onClick={saveItem} disabled={saving || !form.name || !form.unitPrice}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save Item'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-xl border border-border shadow-xl p-6 text-center" style={{ background: 'hsl(var(--card))' }}>
              <Trash2 className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Delete this item?</p>
              <p className="text-sm text-muted-foreground mb-5">This cannot be undone.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-4 py-1.5 rounded text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Cancel</button>
                <button onClick={() => deleteItem(deleteId)} className="px-4 py-1.5 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-xl border border-border shadow-xl overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Import from CSV</h2>
                <button onClick={() => setShowImport(false)} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Paste CSV text or upload a file. Required columns: <code className="bg-muted/50 px-1 rounded">name</code>, <code className="bg-muted/50 px-1 rounded">unitPrice</code>. Optional: <code className="bg-muted/50 px-1 rounded">description</code>, <code className="bg-muted/50 px-1 rounded">category</code>, <code className="bg-muted/50 px-1 rounded">unit</code>, <code className="bg-muted/50 px-1 rounded">vendor</code>, <code className="bg-muted/50 px-1 rounded">sku</code>, <code className="bg-muted/50 px-1 rounded">notes</code>.
                </p>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Upload CSV file</label>
                  <input type="file" accept=".csv,.txt" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => handleCsvChange(ev.target?.result as string ?? '');
                    reader.readAsText(file);
                  }} className="text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border file:text-xs file:font-medium file:bg-muted/30 file:text-foreground hover:file:bg-muted/50 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Or paste CSV text</label>
                  <textarea value={csvText} onChange={e => handleCsvChange(e.target.value)} rows={6} placeholder={"name,unitPrice,category,unit,vendor\n2x4x8 Lumber,4.29,materials,ea,Menards\nDrywall 4x8,12.99,materials,sheet,Lowe's"}
                    className="w-full px-3 py-2 text-xs font-mono bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
                {csvPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{csvPreview.length} valid row{csvPreview.length !== 1 ? 's' : ''} detected:</p>
                    <div className="rounded border border-border overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-3 py-1.5 text-muted-foreground">Name</th>
                          <th className="text-left px-3 py-1.5 text-muted-foreground">Category</th>
                          <th className="text-left px-3 py-1.5 text-muted-foreground">Vendor</th>
                          <th className="text-right px-3 py-1.5 text-muted-foreground">Price</th>
                        </tr></thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="border-b border-border last:border-0" style={{ background: 'hsl(var(--card))' }}>
                              <td className="px-3 py-1.5 text-foreground">{row.name}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{row.category || 'materials'}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{row.vendor || '—'}</td>
                              <td className="px-3 py-1.5 text-right text-foreground tabular-nums">{fmtCurrency(row.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {importStatus && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded border ${importStatus.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {importStatus.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {importStatus.msg}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
                <button onClick={() => setShowImport(false)} className="px-3 py-1.5 rounded text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Close</button>
                <button onClick={doImport} disabled={importing || csvPreview.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" />{importing ? 'Importing…' : `Import ${csvPreview.length} Item${csvPreview.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
