import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, FileText, ClipboardList, FolderOpen, Users, BarChart3, Settings,
  ChevronLeft, ChevronRight, Plus, Search, X, Save, Trash2, ArrowLeft,
  Printer, CheckCircle2, Clock, XCircle, Send, AlertCircle, GripVertical,
  ImagePlus, Loader2, BookOpen, Mail, Upload,
  DollarSign,
} from 'lucide-react';
import { estimates } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id?: number;
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  sortOrder: number;
  photoUrl?: string | null;
}

interface Estimate {
  id: number;
  jobId: number | null;
  estimateNumber: string;
  status: 'draft' | 'sent' | 'approved' | 'declined';
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  projectDescription: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  lineItems: LineItem[];
}

interface Job { id: number; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; }
interface Customer { id: number; name: string; email: string | null; phone: string | null; address: string | null; }

interface PriceLibraryItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unitPrice: string;
  vendor: string | null;
  sku: string | null;
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
  { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | string) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: 'Draft',    color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  sent:     { label: 'Sent',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Send },
  approved: { label: 'Approved', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.color}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  labor: 'bg-blue-500/10 text-blue-400',
  materials: 'bg-amber-500/10 text-amber-400',
  equipment: 'bg-purple-500/10 text-purple-400',
  other: 'bg-muted text-muted-foreground',
};

// ─── Line Item Row ────────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem;
  index: number;
  onChange: (index: number, field: keyof LineItem, value: string | number | null) => void;
  onRemove: (index: number) => void;
  onPhotoUpload: (index: number, url: string | null) => void;
}

function LineItemRow({ item, index, onChange, onRemove, onPhotoUpload }: LineItemRowProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputCls = 'w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch('/api/estimates/photo-upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json() as { url?: string };
      if (data.url) onPhotoUpload(index, data.url);
    } catch { /* ignore */ }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="border-b border-border/50 last:border-0 py-3">
      {/* Main row */}
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-1 flex justify-center text-muted-foreground/40 cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="col-span-4">
          <input className={inputCls} value={item.description} onChange={e => onChange(index, 'description', e.target.value)} placeholder="Description…" />
        </div>
        <div className="col-span-2">
          <select className={inputCls} value={item.category} onChange={e => onChange(index, 'category', e.target.value)}>
            <option value="labor">Labor</option>
            <option value="materials">Materials</option>
            <option value="equipment">Equipment</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-span-1">
          <input className={inputCls} type="number" min="0" step="0.01" value={item.quantity} onChange={e => onChange(index, 'quantity', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="col-span-1">
          <input className={inputCls} value={item.unit} onChange={e => onChange(index, 'unit', e.target.value)} placeholder="ea" />
        </div>
        <div className="col-span-2">
          <input className={inputCls} type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => onChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="0.00" />
        </div>
        <div className="col-span-1 text-right text-sm font-semibold text-foreground tabular-nums pr-1">
          {fmtCurrency(item.quantity * item.unitPrice)}
        </div>
      </div>
      {/* Photo row */}
      <div className="ml-8 mt-2 flex items-center gap-3">
        {item.photoUrl ? (
          <div className="relative group flex-shrink-0">
            <img src={item.photoUrl} alt="Line item" className="w-16 h-16 object-cover rounded border border-border" />
            <button type="button" onClick={() => onPhotoUpload(index, null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-dashed border-border hover:border-primary/50 rounded px-2 py-1.5">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Add photo'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button type="button" onClick={() => onRemove(index)} className="ml-auto text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Remove line
        </button>
      </div>
    </div>
  );
}

// ─── Estimate Form ────────────────────────────────────────────────────────────

const EMPTY_LINE: LineItem = { description: '', category: 'labor', quantity: 1, unit: 'each', unitPrice: 0, sortOrder: 0, photoUrl: null };

interface EstimateFormProps {
  initial?: Partial<Estimate>;
  jobs: Job[];
  onSave: (data: EstimatePayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  onOpenLibrary: () => void;
  addLineItemRef?: React.MutableRefObject<((item: PriceLibraryItem) => void) | null>;
}

interface EstimatePayload {
  jobId?: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  notes: string;
  validUntil: string;
  lineItems: LineItem[];
}

function EstimateForm({ initial, jobs, onSave, onCancel, saving, error, onOpenLibrary, addLineItemRef }: EstimateFormProps) {
  const [jobId, setJobId] = useState<number | null>(initial?.jobId ?? null);
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? '');
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? '');
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? '');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch('/api/customers', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Customer[]) => setCustomers(data))
      .catch(() => {});
  }, []);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    if (id) {
      const c = customers.find(c => c.id === id);
      if (c) {
        setClientName(c.name);
        setClientEmail(c.email ?? '');
        setClientPhone(c.phone ?? '');
        setClientAddress(c.address ?? '');
      }
    }
  };
  const [projectDescription, setProjectDescription] = useState(initial?.projectDescription ?? '');

  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length ? initial.lineItems.map(li => ({ ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })) : [{ ...EMPTY_LINE }]
  );

  // Expose addLineItem to parent via ref so the library picker can inject items
  if (addLineItemRef) {
    addLineItemRef.current = (item: PriceLibraryItem) => {
      const desc = item.description ? item.name + ' \u2014 ' + item.description : item.name;
      setLineItems(prev => [...prev, {
        description: desc,
        category: item.category as LineItem['category'],
        quantity: 1,
        unit: item.unit,
        unitPrice: parseFloat(item.unitPrice),
        sortOrder: prev.length,
      }]);
    };
  }

  // Auto-fill client info from job
  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    setJobId(id);
    if (id) {
      const job = jobs.find(j => j.id === id);
      if (job) {
        setClientName(job.clientName);
        setClientEmail(job.clientEmail ?? '');
        setClientPhone('');
        setClientAddress(job.address ?? '');
      }
    }
  };

  const updateLine = (i: number, field: keyof LineItem, value: string | number | null) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  };
  const updateLinePhoto = (i: number, url: string | null) => {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, photoUrl: url } : li));
  };
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addLine = () => setLineItems(prev => [...prev, { ...EMPTY_LINE, sortOrder: prev.length }]);

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvError('CSV must have a header row and at least one data row.'); return; }
      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
      const colIndex = (names: string[]) => names.reduce<number>((found, n) => found >= 0 ? found : header.indexOf(n), -1);
      const descIdx  = colIndex(['description','desc','item','name','service']);
      const qtyIdx   = colIndex(['quantity','qty','count']);
      const unitIdx  = colIndex(['unit','uom','measure']);
      const priceIdx = colIndex(['unitprice','price','rate','cost','amount']);
      const catIdx   = colIndex(['category','cat','type']);
      if (descIdx < 0) { setCsvError('CSV must have a "description" column.'); return; }
      const VALID_CATS = ['labor','material','equipment','subcontractor','other'];
      const imported: LineItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const desc = cols[descIdx] ?? '';
        if (!desc) continue;
        const rawCat = catIdx >= 0 ? (cols[catIdx] ?? '').toLowerCase() : '';
        const category = VALID_CATS.includes(rawCat) ? rawCat as LineItem['category'] : 'other';
        imported.push({
          description: desc,
          category,
          quantity: qtyIdx >= 0 ? (parseFloat(cols[qtyIdx]) || 1) : 1,
          unit: unitIdx >= 0 ? (cols[unitIdx] || 'each') : 'each',
          unitPrice: priceIdx >= 0 ? (parseFloat(cols[priceIdx]) || 0) : 0,
          sortOrder: lineItems.length + imported.length,
          photoUrl: null,
        });
      }
      if (imported.length === 0) { setCsvError('No valid rows found in CSV.'); return; }
      setLineItems(prev => [...prev, ...imported]);
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const total = subtotal;

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ jobId, clientName, clientEmail, clientPhone, clientAddress, projectDescription, notes, validUntil, lineItems }); }} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Client & Job */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Client & Job</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.length > 0 && (
            <div className="md:col-span-2">
              <label className={labelCls}>Select Existing Customer (optional)</label>
              <select className={inputCls} defaultValue="" onChange={handleCustomerChange}>
                <option value="">— Choose a customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className={labelCls}>Link to Job (optional)</label>
            <select className={inputCls} value={jobId ?? ''} onChange={handleJobChange}>
              <option value="">— No job linked —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Client Name *</label>
            <input className={inputCls} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div>
            <label className={labelCls}>Client Email</label>
            <input className={inputCls} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="jane@email.com" />
          </div>
          <div>
            <label className={labelCls}>Client Phone</label>
            <input className={inputCls} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(317) 555-0100" />
          </div>
          <div>
            <label className={labelCls}>Valid Until</label>
            <input className={inputCls} type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Job Address</label>
            <input className={inputCls} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Indianapolis, IN" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Project Description</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="Brief scope of work…" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Line Items</h3>
        <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-1"></div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1 text-right">Total</div>
          </div>
          <div className="px-3">
            {lineItems.map((li, i) => (
              <LineItemRow key={i} item={li} index={i} onChange={updateLine} onRemove={removeLine} onPhotoUpload={updateLinePhoto} />
            ))}
          </div>
          <div className="px-3 py-2 border-t border-border space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
              <button type="button" onClick={onOpenLibrary} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold border border-border rounded px-2.5 py-1 hover:bg-muted/40 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> From Library
              </button>
              <button type="button" onClick={() => csvInputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold border border-border rounded px-2.5 py-1 hover:bg-muted/40 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} />
            </div>
            {csvError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{csvError}
              </div>
            )}
            <p className="text-xs text-muted-foreground/60">CSV columns: description, quantity, unit, unitPrice, category (labor/material/equipment/subcontractor/other)</p>
          </div>
        </div>
      </div>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelCls}>Internal Notes</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes visible on the estimate…" />
        </div>
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between text-base font-extrabold border-t border-border pt-2 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-foreground">Total</span>
            <span className="text-primary tabular-nums">{fmtCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Estimate'}
        </button>
      </div>
    </form>
  );
}

// ─── Settings Types (for print) ──────────────────────────────────────────────

interface PrintCompanySettings {
  companyName: string; address: string; city: string; state: string; zip: string;
  phone: string; email: string; website: string; logoOnPrint: number;
}
interface PrintDocSettings {
  estimateHeaderText: string; estimateFooterText: string;
  estimateTerms: string; estimateSignatureLine: number;
}

// ─── Print View ───────────────────────────────────────────────────────────────

// ─── Print View (matches Warner Estimate layout) ──────────────────────────────

function PrintView({ est, company, docSettings }: { est: Estimate; company: PrintCompanySettings; docSettings: PrintDocSettings }) {
  const cityLine = [company.city, company.state, company.zip].filter(Boolean).join(', ');

  const DARK_BG  = 'hsl(var(--print-header-bg))';
  const DARK_FG  = 'hsl(var(--print-bg))';
  const DARK_MUT = 'hsl(var(--print-header-fg-muted))';
  const DARK_FNT = 'hsl(var(--print-header-fg-faint))';
  const ACCENT   = 'hsl(var(--print-accent))';
  const BODY_BG  = 'hsl(var(--print-bg))';
  const BODY_FG  = 'hsl(var(--print-fg))';
  const MUTED    = 'hsl(var(--print-fg-subtle))';
  const FAINT    = 'hsl(var(--print-fg-faint))';
  const BORDER   = 'hsl(var(--print-border))';
  const SURFACE  = 'hsl(var(--print-surface))';
  const SURFACE2 = 'hsl(var(--print-surface-2))';

  const css = {
    root: { fontFamily: 'Arial, Helvetica, sans-serif', background: BODY_BG, color: BODY_FG, maxWidth: '760px', margin: '0 auto', fontSize: '13px', lineHeight: '1.5' } as React.CSSProperties,
    headerBand: { background: DARK_BG, color: DARK_FG, padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } as React.CSSProperties,
    bodyPad: { padding: '32px 36px' } as React.CSSProperties,
    metaStrip: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `3px solid ${ACCENT}`, marginBottom: '28px' } as React.CSSProperties,
    metaCell: { padding: '14px 0', borderRight: `1px solid ${BORDER}` } as React.CSSProperties,
    metaCellLast: { padding: '14px 0', borderRight: 'none', textAlign: 'right' as const } as React.CSSProperties,
    metaLabel: { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '3px' } as React.CSSProperties,
    metaValue: { fontWeight: '700', fontSize: '13px', color: BODY_FG } as React.CSSProperties,
    clientBlock: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' } as React.CSSProperties,
    blockLabel: { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px', borderBottom: `2px solid ${ACCENT}`, paddingBottom: '4px', display: 'inline-block' } as React.CSSProperties,
    scopeBox: { background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: '4px', padding: '14px 16px', marginBottom: '28px', fontSize: '12px', color: MUTED } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '0', fontSize: '12px' } as React.CSSProperties,
    thBase: { padding: '9px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.6px', background: DARK_BG, color: DARK_FG, borderBottom: `2px solid ${ACCENT}` } as React.CSSProperties,
    tdBase: { padding: '10px 12px', borderBottom: `1px solid ${SURFACE2}`, verticalAlign: 'top' as const } as React.CSSProperties,
    totalsWrap: { display: 'flex', justifyContent: 'flex-end', marginTop: '0', marginBottom: '28px', borderTop: `1px solid ${BORDER}` } as React.CSSProperties,
    totalsInner: { width: '260px', paddingTop: '12px' } as React.CSSProperties,
    totalsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' } as React.CSSProperties,
    grandTotalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', borderTop: `2px solid ${ACCENT}`, paddingTop: '8px', marginTop: '8px' } as React.CSSProperties,
    sigLine: { borderBottom: `1px solid ${MUTED}`, width: '220px', marginTop: '36px', display: 'inline-block' } as React.CSSProperties,
    sigLabel: { fontSize: '10px', color: FAINT, marginTop: '4px' } as React.CSSProperties,
  };
  const th  = { ...css.thBase, textAlign: 'left' as const };
  const thR = { ...css.thBase, textAlign: 'right' as const };
  const td   = { ...css.tdBase };
  const tdM  = { ...css.tdBase, color: FAINT, textTransform: 'capitalize' as const };
  const tdR  = { ...css.tdBase, textAlign: 'right' as const, color: MUTED };
  const tdRB = { ...css.tdBase, textAlign: 'right' as const, fontWeight: '600' as const };

  return (
    <div style={css.root}>

      {/* ── Dark header band ── */}
      <div style={css.headerBand}>
        <div>
          {company.logoOnPrint === 1 && (
            <img
              src="/airo-assets/images/logo/horizontal"
              alt={company.companyName}
              style={{ maxHeight: '52px', maxWidth: '180px', objectFit: 'contain', marginBottom: '10px', display: 'block' }}
            />
          )}
          <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px', color: DARK_FG }}>{estimates.printLabels.heading}</div>
          <div style={{ fontSize: '13px', color: DARK_MUT, marginTop: '3px' }}>{est.estimateNumber}</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: DARK_FG }}>{company.companyName}</div>
          {company.address && <div style={{ fontSize: '12px', color: DARK_MUT, marginTop: '4px' }}>{company.address}</div>}
          {cityLine && <div style={{ fontSize: '12px', color: DARK_MUT }}>{cityLine}</div>}
          {company.phone && <div style={{ fontSize: '12px', color: DARK_MUT }}>{company.phone}</div>}
          {company.email && <div style={{ fontSize: '12px', color: DARK_MUT }}>{company.email}</div>}
          {company.website && <div style={{ fontSize: '12px', color: DARK_FNT }}>{company.website}</div>}
        </div>
      </div>

      {/* ── Meta strip ── */}
      <div style={css.metaStrip}>
        <div style={css.metaCell}>
          <div style={css.metaLabel}>{estimates.printLabels.dateLabel}</div>
          <div style={css.metaValue}>{new Date(est.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style={{ ...css.metaCell, paddingLeft: '20px' }}>
          <div style={css.metaLabel}>{estimates.printLabels.validUntilLabel}</div>
          <div style={css.metaValue}>{est.validUntil || '—'}</div>
        </div>
        <div style={css.metaCellLast}>
          <div style={css.metaLabel}>{estimates.printLabels.estimateNumLabel}</div>
          <div style={css.metaValue}>{est.estimateNumber}</div>
        </div>
      </div>

      <div style={css.bodyPad}>

        {docSettings.estimateHeaderText && (
          <div style={{ marginBottom: '20px', fontSize: '12px', color: MUTED, textAlign: 'center' as const, fontStyle: 'italic' }}>
            {docSettings.estimateHeaderText}
          </div>
        )}

        {/* ── Prepared For / Job Address ── */}
        <div style={css.clientBlock}>
          <div>
            <div style={css.blockLabel}>{estimates.printLabels.preparedForLabel}</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '6px' }}>{est.clientName}</div>
            {est.clientEmail && <div style={{ color: MUTED, marginTop: '2px' }}>{est.clientEmail}</div>}
            {est.clientPhone && <div style={{ color: MUTED, marginTop: '2px' }}>{est.clientPhone}</div>}
          </div>
          {est.clientAddress && (
            <div>
              <div style={css.blockLabel}>{estimates.printLabels.jobAddressLabel}</div>
              <div style={{ color: MUTED, marginTop: '6px', whiteSpace: 'pre-line' as const }}>{est.clientAddress}</div>
            </div>
          )}
        </div>

        {/* ── Scope of Work ── */}
        {est.projectDescription && (
          <div style={css.scopeBox}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px' }}>{estimates.printLabels.scopeLabel}</div>
            <div style={{ whiteSpace: 'pre-wrap' as const }}>{est.projectDescription}</div>
          </div>
        )}

        {/* ── Line Items Table ── */}
        <table style={css.table}>
          <thead>
            <tr>
              <th style={th}>{estimates.printLabels.descriptionCol}</th>
              <th style={{ ...th, width: '100px' }}>{estimates.printLabels.categoryCol}</th>
              <th style={{ ...thR, width: '80px' }}>{estimates.printLabels.qtyUnitCol}</th>
              <th style={{ ...thR, width: '90px' }}>{estimates.printLabels.unitPriceCol}</th>
              <th style={{ ...thR, width: '90px' }}>{estimates.printLabels.totalCol}</th>
            </tr>
          </thead>
          <tbody>
            {est.lineItems.map((li, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? BODY_BG : SURFACE }}>
                <td style={td}>
                  {li.photoUrl && (
                    <img src={li.photoUrl} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '4px', marginBottom: '5px', display: 'block' }} />
                  )}
                  <span style={{ fontWeight: '500' }}>{li.description}</span>
                </td>
                <td style={tdM}>{li.category}</td>
                <td style={tdR}>{li.quantity} {li.unit}</td>
                <td style={tdR}>{fmtCurrency(li.unitPrice)}</td>
                <td style={tdRB}>{fmtCurrency(li.quantity * li.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div style={css.totalsWrap}>
          <div style={css.totalsInner}>
            <div style={css.totalsRow}>
              <span style={{ color: MUTED }}>{estimates.printLabels.subtotalLabel}</span>
              <span style={{ fontWeight: '600' }}>{fmtCurrency(est.total)}</span>
            </div>
            <div style={css.grandTotalRow}>
              <span>{estimates.printLabels.totalLabel}</span>
              <span style={{ color: ACCENT }}>{fmtCurrency(est.total)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {est.notes && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px' }}>{estimates.printLabels.notesLabel}</div>
            <div style={{ color: MUTED, fontSize: '12px', whiteSpace: 'pre-wrap' as const }}>{est.notes}</div>
          </div>
        )}

        {/* ── Terms & Conditions ── */}
        {docSettings.estimateTerms && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', marginBottom: '20px', fontSize: '11px', color: FAINT }}>
            <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>{estimates.printLabels.termsLabel}</div>
            <div style={{ whiteSpace: 'pre-wrap' as const }}>{docSettings.estimateTerms}</div>
          </div>
        )}

        {/* ── Signature Block ── */}
        {docSettings.estimateSignatureLine === 1 && (
          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '8px' }}>{estimates.printLabels.acceptanceLabel}</div>
            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' as const }}>
              <div><div style={css.sigLine} /><div style={css.sigLabel}>{estimates.printLabels.sigClientLabel}</div></div>
              <div><div style={{ ...css.sigLine, width: '140px' }} /><div style={css.sigLabel}>{estimates.printLabels.sigDateLabel}</div></div>
              <div><div style={{ ...css.sigLine, width: '180px' }} /><div style={css.sigLabel}>{estimates.printLabels.sigNameLabel}</div></div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: '36px', paddingTop: '14px', borderTop: `1px solid ${BORDER}`, fontSize: '11px', color: FAINT, textAlign: 'center' as const }}>
          {docSettings.estimateFooterText || `Thank you for choosing ${company.companyName}`}
        </div>

      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

interface DetailViewProps {
  est: Estimate;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onStatusChange: (status: Estimate['status']) => void;
  onApprove: () => void;
  onCreateInvoice: () => void;
}

function DetailView({ est, onEdit, onDelete, onBack, onStatusChange, onApprove, onCreateInvoice }: DetailViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printCompany, setPrintCompany] = useState<PrintCompanySettings>({
    companyName: 'Dust to Done Renovation Solutions LLC', address: '', city: 'Indianapolis',
    state: 'IN', zip: '', phone: '', email: '', website: '', logoOnPrint: 1,
  });
  const [printDocSettings, setPrintDocSettings] = useState<PrintDocSettings>({
    estimateHeaderText: '', estimateFooterText: '',
    estimateTerms: 'This estimate is valid for 30 days from the date issued. Work will commence upon written approval.',
    estimateSignatureLine: 1,
  });

  useEffect(() => {
    void Promise.all([
      fetch('/api/settings/company').then(r => r.json() as Promise<PrintCompanySettings>),
      fetch('/api/settings/documents').then(r => r.json() as Promise<PrintDocSettings>),
    ]).then(([c, d]) => { setPrintCompany(c); setPrintDocSettings(d); }).catch(() => {});
  }, []);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${est.estimateNumber}</title><style>*{box-sizing:border-box}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${printContent}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSendToClient = async () => {
    if (!est.clientEmail) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch(`/api/estimates/${est.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: est.clientEmail }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setSendMsg({ ok: true, text: `Sent to ${est.clientEmail}` });
      } else {
        setSendMsg({ ok: false, text: data.error ?? 'Failed to send' });
      }
    } catch {
      setSendMsg({ ok: false, text: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const categoryTotals = est.lineItems.reduce<Record<string, number>>((acc, li) => {
    acc[li.category] = (acc[li.category] ?? 0) + li.quantity * li.unitPrice;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to estimates
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{est.estimateNumber}</h2>
            <StatusBadge status={est.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{est.clientName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={est.status} onChange={e => onStatusChange(e.target.value as Estimate['status'])}
            className="bg-muted border border-border rounded-md px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
          {(est.status === 'draft' || est.status === 'sent') && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-md transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {est.clientEmail && (
            <button
              onClick={() => void handleSendToClient()}
              disabled={sending}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-md transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {sending ? 'Sending…' : 'Send to Client'}
            </button>
          )}
          <button onClick={handlePrint} className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-border">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button onClick={onCreateInvoice} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
            <FileText className="w-3.5 h-3.5" /> Create Invoice
          </button>
          <button onClick={onEdit} className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-border">
            Edit
          </button>
          <button onClick={onDelete} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors border border-red-500/30">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {sendMsg && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium ${sendMsg.ok ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
          {sendMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {sendMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Client</p>
          <p className="text-sm font-semibold text-foreground">{est.clientName}</p>
          {est.clientEmail && <p className="text-xs text-muted-foreground mt-1">{est.clientEmail}</p>}
          {est.clientPhone && <p className="text-xs text-muted-foreground">{est.clientPhone}</p>}
          {est.clientAddress && <p className="text-xs text-muted-foreground mt-1">{est.clientAddress}</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
          <div className="space-y-1 text-sm">

            <div className="flex justify-between font-extrabold text-base border-t border-border pt-1 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              <span>Total</span><span className="text-primary tabular-nums">{fmtCurrency(est.total)}</span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">By Category</p>
          <div className="space-y-1.5">
            {Object.entries(categoryTotals).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${CATEGORY_COLORS[cat]}`}>{cat}</span>
                <span className="text-sm tabular-nums text-foreground">{fmtCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {est.projectDescription && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Scope of Work</p>
          <p className="text-sm text-foreground">{est.projectDescription}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Qty / Unit</div>
          <div className="col-span-1 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        <div className="divide-y divide-border">
          {est.lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 items-start">
              <div className="col-span-5 flex items-start gap-3">
                {li.photoUrl && <img src={li.photoUrl} alt="" className="w-12 h-12 object-cover rounded border border-border flex-shrink-0" />}
                <span className="text-sm text-foreground">{li.description}</span>
              </div>
              <div className="col-span-2"><span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${CATEGORY_COLORS[li.category]}`}>{li.category}</span></div>
              <div className="col-span-2 text-right text-sm text-muted-foreground">{li.quantity} {li.unit}</div>
              <div className="col-span-1 text-right text-sm text-muted-foreground tabular-nums">{fmtCurrency(li.unitPrice)}</div>
              <div className="col-span-2 text-right text-sm font-semibold text-foreground tabular-nums">{fmtCurrency(li.quantity * li.unitPrice)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden print target */}
      <div ref={printRef} className="hidden"><PrintView est={est} company={printCompany} docSettings={printDocSettings} /></div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EstimatesPage() {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId?: string }>();

  const [collapsed, setCollapsed] = useState(false);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEst, setEditingEst] = useState<Estimate | null>(null);
  const [selectedEst, setSelectedEst] = useState<Estimate | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Price Library state (lives here so the modal can be rendered at page level)
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<PriceLibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const addLineItemRef = useRef<((item: PriceLibraryItem) => void) | null>(null);

  const openLibrary = () => {
    setShowLibrary(true);
    setLibrarySearch('');
    setLibraryCategory('all');
    void fetch('/api/price-library').then(r => r.json()).then((d: PriceLibraryItem[]) => setLibraryItems(d)).catch(() => {});
  };

  const filteredLibrary = libraryItems.filter(item => {
    const matchSearch = !librarySearch || item.name.toLowerCase().includes(librarySearch.toLowerCase()) || (item.vendor ?? '').toLowerCase().includes(librarySearch.toLowerCase());
    const matchCat = libraryCategory === 'all' || item.category === libraryCategory;
    return matchSearch && matchCat;
  });

  const addFromLibrary = (item: PriceLibraryItem) => {
    if (addLineItemRef.current) addLineItemRef.current(item);
    setShowLibrary(false);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [estRes, jobRes] = await Promise.all([fetch('/api/estimates'), fetch('/api/jobs')]);
      const [estData, jobData] = await Promise.all([estRes.json() as Promise<Estimate[]>, jobRes.json() as Promise<Job[]>]);
      setEstimates(estData);
      setJobs(jobData);
      if (estimateId) {
        const found = estData.find(e => e.id === Number(estimateId));
        if (found) {
          const detail = await fetch(`/api/estimates/${found.id}`);
          setSelectedEst(await detail.json() as Estimate);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [estimateId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const filtered = estimates.filter(e =>
    e.estimateNumber.toLowerCase().includes(search.toLowerCase()) ||
    e.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: EstimatePayload) => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/estimates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create estimate');
      await fetchAll();
      setShowForm(false);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data: EstimatePayload) => {
    if (!editingEst) return;
    setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/estimates/${editingEst.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update estimate');
      const updated = await res.json() as Estimate;
      setSelectedEst(updated);
      setEditingEst(null);
      await fetchAll();
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (est: Estimate) => {
    if (!confirm(`Delete ${est.estimateNumber}? This cannot be undone.`)) return;
    await fetch(`/api/estimates/${est.id}`, { method: 'DELETE' });
    setSelectedEst(null);
    navigate('/estimates');
    await fetchAll();
  };

  const handleApprove = async () => {
    if (!selectedEst) return;
    try {
      const res = await fetch(`/api/estimates/${selectedEst.id}/approve`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json() as Estimate;
        setSelectedEst(updated);
        await fetchAll();
      }
    } catch (e) { console.error('approve error', e); }
  };

  const handleStatusChange = async (status: Estimate['status']) => {
    if (!selectedEst) return;
    const detail = await fetch(`/api/estimates/${selectedEst.id}`);
    const full = await detail.json() as Estimate;
    const res = await fetch(`/api/estimates/${selectedEst.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...full, status, lineItems: full.lineItems.map(li => ({ ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })) }),
    });
    if (res.ok) {
      const updated = await res.json() as Estimate;
      setSelectedEst(updated);
      setEstimates(prev => prev.map(e => e.id === updated.id ? updated : e));
    }
  };

  const openDetail = async (est: Estimate) => {
    navigate(`/estimates/${est.id}`);
    const res = await fetch(`/api/estimates/${est.id}`);
    setSelectedEst(await res.json() as Estimate);
  };

  const handleCreateInvoice = async () => {
    if (!selectedEst) return;
    try {
      const res = await fetch(`/api/estimates/${selectedEst.id}/create-invoice`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create invoice');
      const { invoiceId } = await res.json() as { invoiceId: number };
      navigate(`/invoices/${invoiceId}`);
    } catch (e) {
      alert('Could not create invoice: ' + String(e));
    }
  };

  return (
    <>
      <Helmet>
        <title>Estimates – Dust to Done</title>
        <meta name="description" content="Create and manage job estimates with line items, totals, and printable PDF views." />
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
              const active = id === 'estimates';
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Estimates</h1>
              <p className="text-xs text-muted-foreground">{estimates.length} total</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search estimates…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52" />
              </div>
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setEditingEst(null); setSelectedEst(null); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Estimate
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {showForm && !editingEst && (
                <motion.div key="new-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>New Estimate</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <EstimateForm jobs={jobs} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} error={formError} onOpenLibrary={openLibrary} addLineItemRef={addLineItemRef} />
                </motion.div>
              )}

              {editingEst && (
                <motion.div key="edit-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit {editingEst.estimateNumber}</h2>
                    <button onClick={() => setEditingEst(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <EstimateForm initial={editingEst} jobs={jobs} onSave={handleUpdate} onCancel={() => setEditingEst(null)} saving={saving} error={formError} onOpenLibrary={openLibrary} addLineItemRef={addLineItemRef} />
                </motion.div>
              )}

              {selectedEst && !editingEst && !showForm && (
                <motion.div key={`detail-${selectedEst.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <DetailView
                    est={selectedEst}
                    onEdit={() => setEditingEst(selectedEst)}
                    onDelete={() => handleDelete(selectedEst)}
                    onCreateInvoice={handleCreateInvoice}
                    onBack={() => { setSelectedEst(null); navigate('/estimates'); }}
                    onStatusChange={handleStatusChange}
                    onApprove={handleApprove}
                  />
                </motion.div>
              )}

              {!selectedEst && !showForm && !editingEst && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {loading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{search ? 'No estimates match your search.' : 'No estimates yet. Create your first estimate.'}</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-3">Estimate #</div>
                        <div className="col-span-3">Client</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-2">Valid Until</div>
                      </div>
                      <div className="divide-y divide-border">
                        {filtered.map(est => (
                          <div key={est.id} onClick={() => openDetail(est)}
                            className="grid grid-cols-12 gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center">
                            <div className="col-span-3 text-sm font-semibold text-foreground">{est.estimateNumber}</div>
                            <div className="col-span-3 text-sm text-muted-foreground truncate">{est.clientName}</div>
                            <div className="col-span-2"><StatusBadge status={est.status} /></div>
                            <div className="col-span-2 text-right text-sm font-bold text-foreground tabular-nums">{fmtCurrency(est.total)}</div>
                            <div className="col-span-2 text-sm text-muted-foreground">{est.validUntil ?? '—'}</div>
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

      {/* Price Library Picker */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[80vh]" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <h2 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Price Library</h2>
                <button onClick={() => setShowLibrary(false)} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap flex-shrink-0">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search items or vendor…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all','materials','labor','equipment','permits','other'].map(cat => (
                    <button key={cat} onClick={() => setLibraryCategory(cat)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${libraryCategory === cat ? 'bg-primary/15 text-primary border-primary/30' : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredLibrary.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                    <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No items found. Add items in the Price Library.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border sticky top-0" style={{ background: 'hsl(var(--card))' }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Vendor</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Unit</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Price</th>
                      <th className="px-4 py-2.5"></th>
                    </tr></thead>
                    <tbody>
                      {filteredLibrary.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors" style={{ background: 'hsl(var(--card))' }}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.vendor || '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.unit}</td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{Number(item.unitPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => addFromLibrary(item)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-colors">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
