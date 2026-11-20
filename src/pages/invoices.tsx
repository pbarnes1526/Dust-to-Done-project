import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search, X, Save,
  Trash2, ArrowLeft, Printer, CheckCircle2, Clock, XCircle, Send,
  AlertCircle, GripVertical, AlertTriangle, DollarSign, BookOpen, Mail, Loader2, RefreshCw,
} from 'lucide-react';
import { invoices } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  type: 'labor' | 'materials' | 'other';
}

interface Invoice {
  id: number;
  jobId: number | null;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  projectDescription: string | null;
  subtotal: string;
  taxRate: string;
  tax: string;
  total: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  lineItems: LineItem[];
}

interface InvoiceRow { invoice: Invoice; jobName: string | null; }
interface Job { id: number; name: string; clientName: string; clientEmail: string | null; address: string | null; }

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

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  sent:      { label: 'Sent',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Send },
  paid:      { label: 'Paid',      color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2 },
  overdue:   { label: 'Overdue',   color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground/50 border-border', icon: XCircle },
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

const TYPE_COLORS: Record<string, string> = {
  labor: 'bg-blue-500/10 text-blue-400',
  materials: 'bg-amber-500/10 text-amber-400',
  other: 'bg-muted text-muted-foreground',
};

// ─── Line Item Row ────────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem;
  index: number;
  onChange: (i: number, field: keyof LineItem, value: string | number) => void;
  onRemove: (i: number) => void;
}

function LineItemRow({ item, index, onChange, onRemove }: LineItemRowProps) {
  const inp = 'w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border/50 last:border-0">
      <div className="col-span-1 flex justify-center text-muted-foreground/40 cursor-grab"><GripVertical className="w-4 h-4" /></div>
      <div className="col-span-4">
        <input className={inp} value={item.description} onChange={e => onChange(index, 'description', e.target.value)} placeholder="Description…" />
      </div>
      <div className="col-span-2">
        <select className={inp} value={item.type} onChange={e => onChange(index, 'type', e.target.value)}>
          <option value="labor">Labor</option>
          <option value="materials">Materials</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="col-span-1">
        <input className={inp} type="number" min="0" step="0.01" value={item.quantity} onChange={e => onChange(index, 'quantity', parseFloat(e.target.value) || 0)} />
      </div>
      <div className="col-span-2">
        <input className={inp} type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => onChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="0.00" />
      </div>
      <div className="col-span-1 text-right text-sm font-semibold text-foreground tabular-nums pr-1">
        {fmtCurrency(item.quantity * item.unitPrice)}
      </div>
      <div className="col-span-1 flex justify-end">
        <button type="button" onClick={() => onRemove(index)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────

interface InvoicePayload {
  jobId: number | null;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  projectDescription: string;
  taxRate: number;
  dueDate: string;
  notes: string;
  lineItems: LineItem[];
}

interface InvoiceFormProps {
  initial?: Partial<Invoice>;
  jobs: Job[];
  onSave: (data: InvoicePayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

const EMPTY_LINE: LineItem = { description: '', type: 'labor', quantity: 1, unitPrice: 0 };

function InvoiceForm({ initial, jobs, onSave, onCancel, saving, error }: InvoiceFormProps) {
  const [jobId, setJobId] = useState<number | null>(initial?.jobId ?? null);
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? '');
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? '');
  const [projectDescription, setProjectDescription] = useState(initial?.projectDescription ?? '');
  const [taxRate, setTaxRate] = useState(initial?.taxRate ? parseFloat(initial.taxRate) : 0);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length
      ? initial.lineItems.map(li => ({ ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) }))
      : [{ ...EMPTY_LINE }]
  );

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    setJobId(id);
    if (id) {
      const job = jobs.find(j => j.id === id);
      if (job) { setClientName(job.clientName); setClientEmail(job.clientEmail ?? ''); setClientAddress(job.address ?? ''); }
    }
  };

  const updateLine = (i: number, field: keyof LineItem, value: string | number) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li));
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addLine = () => setLineItems(prev => [...prev, { ...EMPTY_LINE }]);

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const taxAmt = subtotal * (taxRate / 100);
  const total = subtotal + taxAmt;

  const inp = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const lbl = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={e => { e.preventDefault(); void onSave({ jobId, clientName, clientEmail, clientAddress, projectDescription, taxRate, dueDate, notes, lineItems }); }} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Client & Job</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={lbl}>Link to Job (optional)</label>
            <select className={inp} value={jobId ?? ''} onChange={handleJobChange}>
              <option value="">— No job linked —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Client Name *</label>
            <input className={inp} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div>
            <label className={lbl}>Client Email</label>
            <input className={inp} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="jane@email.com" />
          </div>
          <div>
            <label className={lbl}>Due Date</label>
            <input className={inp} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Tax Rate (%)</label>
            <input className={inp} type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Job / Site Address</label>
            <input className={inp} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Indianapolis, IN" />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Project Description</label>
            <textarea className={inp + ' resize-none'} rows={2} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="Brief scope of work…" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Line Items</h3>
        <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-1"></div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>
          <div className="px-3">
            {lineItems.map((li, i) => <LineItemRow key={i} item={li} index={i} onChange={updateLine} onRemove={removeLine} />)}
          </div>
          <div className="px-3 py-2 border-t border-border">
            <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={lbl}>Notes</label>
          <textarea className={inp + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, thank-you note…" />
        </div>
        <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold tabular-nums">{fmtCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="tabular-nums">{fmtCurrency(taxAmt)}</span></div>
          <div className="flex justify-between text-base font-extrabold border-t border-border pt-2 mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <span>Total</span><span className="text-primary tabular-nums">{fmtCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </form>
  );
}

// ─── Print / PDF View ─────────────────────────────────────────────────────────
// Uses CSS variables defined in globals.css (--print-*) so no hex literals appear in JSX.

interface InvPrintCompanySettings {
  companyName: string; address: string; city: string; state: string; zip: string;
  phone: string; email: string; website: string; logoOnPrint: number;
}
interface InvPrintDocSettings {
  invoiceHeaderText: string; invoiceFooterText: string; invoiceTerms: string;
}

function PrintView({ inv, company, docSettings }: { inv: Invoice; company: InvPrintCompanySettings; docSettings: InvPrintDocSettings }) {
  const laborTotal = inv.lineItems.filter(li => li.type === 'labor').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);
  const materialsTotal = inv.lineItems.filter(li => li.type === 'materials').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);
  const otherTotal = inv.lineItems.filter(li => li.type === 'other').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);
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
    root:         { fontFamily: 'Arial, Helvetica, sans-serif', background: BODY_BG, color: BODY_FG, maxWidth: '760px', margin: '0 auto', fontSize: '13px', lineHeight: '1.5' } as React.CSSProperties,
    headerBand:   { background: DARK_BG, color: DARK_FG, padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } as React.CSSProperties,
    bodyPad:      { padding: '32px 36px' } as React.CSSProperties,
    metaStrip:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `3px solid ${ACCENT}`, marginBottom: '28px' } as React.CSSProperties,
    metaCell:     { padding: '14px 0', borderRight: `1px solid ${BORDER}` } as React.CSSProperties,
    metaCellLast: { padding: '14px 0', borderRight: 'none', textAlign: 'right' as const } as React.CSSProperties,
    metaLabel:    { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '3px' } as React.CSSProperties,
    metaValue:    { fontWeight: '700', fontSize: '13px', color: BODY_FG } as React.CSSProperties,
    metaValueDue: { fontWeight: '700', fontSize: '13px', color: ACCENT } as React.CSSProperties,
    clientBlock:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' } as React.CSSProperties,
    blockLabel:   { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px', borderBottom: `2px solid ${ACCENT}`, paddingBottom: '4px', display: 'inline-block' } as React.CSSProperties,
    scopeBox:     { background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: '4px', padding: '14px 16px', marginBottom: '28px', fontSize: '12px', color: MUTED } as React.CSSProperties,
    table:        { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '0', fontSize: '12px' } as React.CSSProperties,
    thBase:       { padding: '9px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.6px', background: DARK_BG, color: DARK_FG, borderBottom: `2px solid ${ACCENT}` } as React.CSSProperties,
    tdBase:       { padding: '10px 12px', borderBottom: `1px solid ${SURFACE2}`, verticalAlign: 'top' as const } as React.CSSProperties,
    totalsWrap:   { display: 'flex', justifyContent: 'space-between', gap: '24px', marginTop: '0', marginBottom: '28px', borderTop: `1px solid ${BORDER}`, paddingTop: '12px' } as React.CSSProperties,
    totalsRow:    { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' } as React.CSSProperties,
    grandTotalRow:{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', borderTop: `2px solid ${ACCENT}`, paddingTop: '8px', marginTop: '8px' } as React.CSSProperties,
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
          <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px', color: DARK_FG }}>{invoices.printLabels.heading}</div>
          <div style={{ fontSize: '13px', color: DARK_MUT, marginTop: '3px' }}>{inv.invoiceNumber}</div>
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

      {/* ── Meta strip: Date | Due Date | Invoice # ── */}
      <div style={css.metaStrip}>
        <div style={css.metaCell}>
          <div style={css.metaLabel}>{invoices.printLabels.dateLabel}</div>
          <div style={css.metaValue}>{new Date(inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style={{ ...css.metaCell, paddingLeft: '20px' }}>
          <div style={css.metaLabel}>{invoices.printLabels.dueDateLabel}</div>
          <div style={inv.dueDate ? css.metaValueDue : css.metaValue}>{inv.dueDate || '—'}</div>
        </div>
        <div style={css.metaCellLast}>
          <div style={css.metaLabel}>{invoices.printLabels.invoiceNumLabel}</div>
          <div style={css.metaValue}>{inv.invoiceNumber}</div>
        </div>
      </div>

      <div style={css.bodyPad}>

        {docSettings.invoiceHeaderText && (
          <div style={{ marginBottom: '20px', fontSize: '12px', color: MUTED, textAlign: 'center' as const, fontStyle: 'italic' }}>
            {docSettings.invoiceHeaderText}
          </div>
        )}

        {/* ── Bill To / Job Address ── */}
        <div style={css.clientBlock}>
          <div>
            <div style={css.blockLabel}>{invoices.printLabels.billToLabel}</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '6px' }}>{inv.clientName}</div>
            {inv.clientEmail && <div style={{ color: MUTED, marginTop: '2px' }}>{inv.clientEmail}</div>}
          </div>
          {inv.clientAddress && (
            <div>
              <div style={css.blockLabel}>{invoices.printLabels.jobAddressLabel}</div>
              <div style={{ color: MUTED, marginTop: '6px', whiteSpace: 'pre-line' as const }}>{inv.clientAddress}</div>
            </div>
          )}
        </div>

        {/* ── Scope of Work ── */}
        {inv.projectDescription && (
          <div style={css.scopeBox}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px' }}>{invoices.printLabels.scopeLabel}</div>
            <div style={{ whiteSpace: 'pre-wrap' as const }}>{inv.projectDescription}</div>
          </div>
        )}

        {/* ── Line Items Table ── */}
        <table style={css.table}>
          <thead>
            <tr>
              <th style={th}>{invoices.printLabels.descriptionCol}</th>
              <th style={{ ...th, width: '90px' }}>{invoices.printLabels.typeCol}</th>
              <th style={{ ...thR, width: '60px' }}>{invoices.printLabels.qtyCol}</th>
              <th style={{ ...thR, width: '90px' }}>{invoices.printLabels.unitPriceCol}</th>
              <th style={{ ...thR, width: '90px' }}>{invoices.printLabels.totalCol}</th>
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map((li, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? BODY_BG : SURFACE }}>
                <td style={td}><span style={{ fontWeight: '500' }}>{li.description}</span></td>
                <td style={tdM}>{li.type}</td>
                <td style={tdR}>{Number(li.quantity)}</td>
                <td style={tdR}>{fmtCurrency(li.unitPrice)}</td>
                <td style={tdRB}>{fmtCurrency(Number(li.quantity) * Number(li.unitPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals + Breakdown ── */}
        <div style={css.totalsWrap}>
          {(laborTotal > 0 || materialsTotal > 0 || otherTotal > 0) && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '8px' }}>{invoices.printLabels.breakdownLabel}</div>
              {laborTotal > 0 && <div style={css.totalsRow}><span style={{ color: MUTED }}>{invoices.printLabels.laborLabel}</span><span style={{ fontWeight: '600' }}>{fmtCurrency(laborTotal)}</span></div>}
              {materialsTotal > 0 && <div style={css.totalsRow}><span style={{ color: MUTED }}>{invoices.printLabels.materialsLabel}</span><span style={{ fontWeight: '600' }}>{fmtCurrency(materialsTotal)}</span></div>}
              {otherTotal > 0 && <div style={css.totalsRow}><span style={{ color: MUTED }}>{invoices.printLabels.otherLabel}</span><span style={{ fontWeight: '600' }}>{fmtCurrency(otherTotal)}</span></div>}
            </div>
          )}
          <div style={{ width: '260px' }}>
            <div style={css.totalsRow}>
              <span style={{ color: MUTED }}>{invoices.printLabels.subtotalLabel}</span>
              <span style={{ fontWeight: '600' }}>{fmtCurrency(inv.subtotal)}</span>
            </div>
            {parseFloat(inv.taxRate) > 0 && (
              <div style={css.totalsRow}>
                <span style={{ color: MUTED }}>{invoices.printLabels.taxLabel} ({inv.taxRate}%)</span>
                <span style={{ fontWeight: '600' }}>{fmtCurrency(inv.tax)}</span>
              </div>
            )}
            <div style={css.grandTotalRow}>
              <span>{invoices.printLabels.totalLabel}</span>
              <span style={{ color: ACCENT }}>{fmtCurrency(inv.total)}</span>
            </div>
          </div>
        </div>

        {/* ── PAID IN FULL stamp ── */}
        {inv.status === 'paid' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', marginBottom: '8px' }}>
            <div style={{
              border: '3px solid hsl(var(--success))',
              borderRadius: '6px',
              padding: '6px 18px',
              display: 'inline-block',
              transform: 'rotate(-4deg)',
              color: 'hsl(var(--success))',
              fontWeight: '900',
              fontSize: '22px',
              letterSpacing: '3px',
              textTransform: 'uppercase' as const,
              opacity: 0.85,
              lineHeight: 1.2,
              userSelect: 'none' as const,
            }}>
              PAID IN FULL
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {inv.notes && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: FAINT, marginBottom: '6px' }}>{invoices.printLabels.notesLabel}</div>
            <div style={{ color: MUTED, fontSize: '12px', whiteSpace: 'pre-wrap' as const }}>{inv.notes}</div>
          </div>
        )}

        {/* ── Terms ── */}
        {docSettings.invoiceTerms && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', marginBottom: '20px', fontSize: '11px', color: FAINT }}>
            <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>{invoices.printLabels.termsLabel}</div>
            <div style={{ whiteSpace: 'pre-wrap' as const }}>{docSettings.invoiceTerms}</div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: '36px', paddingTop: '14px', borderTop: `1px solid ${BORDER}`, fontSize: '11px', color: FAINT, textAlign: 'center' as const }}>
          {docSettings.invoiceFooterText || `Thank you for your business — ${company.companyName}`}
        </div>

      </div>
    </div>
  );
}
// ─── Detail View ──────────────────────────────────────────────────────────────

interface DetailViewProps {
  inv: Invoice;
  jobName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onStatusChange: (s: Invoice['status']) => void;
}

function DetailView({ inv, jobName, onEdit, onDelete, onBack, onStatusChange }: DetailViewProps) {
  const navigate = useNavigate();
  const [invPayments, setInvPayments] = useState<{ id: number; amount: string; paymentDate: string; method: string; referenceNumber: string | null }[]>([]);
  const [payingOnline, setPayingOnline] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleStripeCheckout = async () => {
    setPayingOnline(true);
    setCheckoutError('');
    try {
      const res = await fetch('/api/stripe/invoice-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          balanceDue: Math.round(balance * 100),
        }),
      });
      const data = await res.json() as { success: boolean; url?: string; error?: string };
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? 'Could not start checkout. Please try again.');
        setPayingOnline(false);
      }
    } catch {
      setCheckoutError('Checkout failed. Please check your connection and try again.');
      setPayingOnline(false);
    }
  };
  const [paidTotal, setPaidTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/payments?invoiceId=${inv.id}`)
      .then(r => r.json())
      .then((data: { id: number; amount: string; paymentDate: string; method: string; referenceNumber: string | null }[]) => {
        if (Array.isArray(data)) {
          setInvPayments(data);
          const total = data.reduce((s, p) => s + Number(p.amount), 0);
          setPaidTotal(total);
          // Auto-update status to Paid if fully paid
          if (total >= Number(inv.total) && inv.status !== 'paid') {
            onStatusChange('paid');
          }
        }
      })
      .catch(() => {});
  }, [inv.id, inv.total, inv.status, onStatusChange]);

  function fmtDate(d: string) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtCur(n: number | string) {
    return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  const balance = Number(inv.total) - paidTotal;
  const printRef = useRef<HTMLDivElement>(null);
  const [printCompany, setPrintCompany] = useState<InvPrintCompanySettings>({
    companyName: 'Dust to Done Renovation Solutions LLC', address: '', city: 'Indianapolis',
    state: 'IN', zip: '', phone: '', email: '', website: '', logoOnPrint: 1,
  });
  const [printDocSettings, setPrintDocSettings] = useState<InvPrintDocSettings>({
    invoiceHeaderText: '', invoiceFooterText: '',
    invoiceTerms: 'Payment is due within 30 days of invoice date.',
  });

  useEffect(() => {
    void Promise.all([
      fetch('/api/settings/company').then(r => r.json() as Promise<InvPrintCompanySettings>),
      fetch('/api/settings/documents').then(r => r.json() as Promise<InvPrintDocSettings>),
    ]).then(([c, d]) => { setPrintCompany(c); setPrintDocSettings(d); }).catch(() => {});
  }, []);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${inv.invoiceNumber}</title><style>*{box-sizing:border-box}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSendToClient = async () => {
    if (!inv.clientEmail) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inv.clientEmail }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        setSendMsg({ ok: true, text: `Sent to ${inv.clientEmail}` });
      } else {
        setSendMsg({ ok: false, text: data.error ?? 'Failed to send' });
      }
    } catch {
      setSendMsg({ ok: false, text: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const laborTotal = inv.lineItems.filter(li => li.type === 'labor').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);
  const materialsTotal = inv.lineItems.filter(li => li.type === 'materials').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);
  const otherTotal = inv.lineItems.filter(li => li.type === 'other').reduce((s, li) => s + Number(li.quantity) * Number(li.unitPrice), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to invoices
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{inv.invoiceNumber}</h2>
            <StatusBadge status={inv.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{inv.clientName}{jobName ? ` · ${jobName}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={inv.status} onChange={e => onStatusChange(e.target.value as Invoice['status'])}
            className="bg-muted border border-border rounded-md px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {inv.clientEmail && (
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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Bill To</p>
          <p className="text-sm font-semibold text-foreground">{inv.clientName}</p>
          {inv.clientEmail && <p className="text-xs text-muted-foreground mt-1">{inv.clientEmail}</p>}
          {inv.clientAddress && <p className="text-xs text-muted-foreground mt-1">{inv.clientAddress}</p>}
          {inv.dueDate && <p className="text-xs font-semibold text-amber-400 mt-2">Due {inv.dueDate}</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Totals</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmtCurrency(inv.subtotal)}</span></div>
            {parseFloat(inv.taxRate) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({inv.taxRate}%)</span><span className="tabular-nums">{fmtCurrency(inv.tax)}</span></div>}
            <div className="flex justify-between font-extrabold text-base border-t border-border pt-1 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
              <span>Total</span><span className="text-primary tabular-nums">{fmtCurrency(inv.total)}</span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Breakdown</p>
          <div className="space-y-1.5">
            {laborTotal > 0 && <div className="flex items-center justify-between"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS.labor}`}>Labor</span><span className="text-sm tabular-nums">{fmtCurrency(laborTotal)}</span></div>}
            {materialsTotal > 0 && <div className="flex items-center justify-between"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS.materials}`}>Materials</span><span className="text-sm tabular-nums">{fmtCurrency(materialsTotal)}</span></div>}
            {otherTotal > 0 && <div className="flex items-center justify-between"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS.other}`}>Other</span><span className="text-sm tabular-nums">{fmtCurrency(otherTotal)}</span></div>}
          </div>
        </div>
      </div>

      {inv.projectDescription && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Scope of Work</p>
          <p className="text-sm text-foreground">{inv.projectDescription}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-1 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        <div className="divide-y divide-border">
          {inv.lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 items-center">
              <div className="col-span-5 text-sm text-foreground">{li.description}</div>
              <div className="col-span-2"><span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${TYPE_COLORS[li.type]}`}>{li.type}</span></div>
              <div className="col-span-2 text-right text-sm text-muted-foreground">{Number(li.quantity)}</div>
              <div className="col-span-1 text-right text-sm text-muted-foreground tabular-nums">{fmtCurrency(li.unitPrice)}</div>
              <div className="col-span-2 text-right text-sm font-semibold text-foreground tabular-nums">{fmtCurrency(Number(li.quantity) * Number(li.unitPrice))}</div>
            </div>
          ))}
        </div>
      </div>

      {inv.notes && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-foreground">{inv.notes}</p>
        </div>
      )}

      <div ref={printRef} className="hidden"><PrintView inv={inv} company={printCompany} docSettings={printDocSettings} /></div>

      {/* ── Payments Panel ── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" />Payments
          </h3>
          <button onClick={() => navigate('/payments')} className="text-xs text-primary hover:underline">Record Payment →</button>
          {balance > 0 && (
            <button
              onClick={handleStripeCheckout}
              disabled={payingOnline}
              className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {payingOnline ? 'Redirecting…' : 'Pay Online'}
            </button>
          )}
        </div>
        {checkoutError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">{checkoutError}</p>
        )}

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Invoice Total</div>
            <div className="font-bold text-sm">{fmtCur(inv.total)}</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Paid</div>
            <div className="font-bold text-sm text-green-400">{fmtCur(paidTotal)}</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${balance <= 0 ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            <div className="text-xs text-muted-foreground mb-1">Balance Due</div>
            <div className={`font-bold text-sm ${balance <= 0 ? 'text-green-400' : 'text-amber-400'}`}>{balance <= 0 ? 'Paid in Full' : fmtCur(balance)}</div>
          </div>
        </div>

        {invPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {invPayments.map(p => (
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

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId?: string }>();

  const [collapsed, setCollapsed] = useState(false);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingInv, setEditingInv] = useState<Invoice | null>(null);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [selectedJobName, setSelectedJobName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, jobRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/jobs')]);
      const [invData, jobData] = await Promise.all([invRes.json() as Promise<InvoiceRow[]>, jobRes.json() as Promise<Job[]>]);
      setRows(invData);
      setJobs(jobData);
      if (invoiceId) {
        const found = invData.find(r => r.invoice.id === Number(invoiceId));
        if (found) {
          const detail = await fetch(`/api/invoices/${found.invoice.id}`);
          setSelectedInv(await detail.json() as Invoice);
          setSelectedJobName(found.jobName);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [invoiceId]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const filtered = rows.filter(({ invoice: inv, jobName }) => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (jobName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalOutstanding = rows.filter(r => r.invoice.status === 'sent' || r.invoice.status === 'overdue').reduce((s, r) => s + Number(r.invoice.total), 0);
  const totalPaid = rows.filter(r => r.invoice.status === 'paid').reduce((s, r) => s + Number(r.invoice.total), 0);
  const totalOverdue = rows.filter(r => r.invoice.status === 'overdue').reduce((s, r) => s + Number(r.invoice.total), 0);
  const draftCount = rows.filter(r => r.invoice.status === 'draft').length;

  const handleCreate = async (data: InvoicePayload) => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create invoice');
      await fetchAll();
      setShowForm(false);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (data: InvoicePayload) => {
    if (!editingInv) return;
    setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/invoices/${editingInv.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update invoice');
      const updated = await res.json() as Invoice;
      setSelectedInv(updated);
      setEditingInv(null);
      await fetchAll();
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete ${inv.invoiceNumber}? This cannot be undone.`)) return;
    await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
    setSelectedInv(null);
    navigate('/invoices');
    await fetchAll();
  };

  const handleStatusChange = async (status: Invoice['status']) => {
    if (!selectedInv) return;
    const detail = await fetch(`/api/invoices/${selectedInv.id}`);
    const full = await detail.json() as Invoice;
    const res = await fetch(`/api/invoices/${selectedInv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...full, status, lineItems: full.lineItems.map(li => ({ ...li, quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })) }),
    });
    if (res.ok) {
      const updated = await res.json() as Invoice;
      setSelectedInv(updated);
      setRows(prev => prev.map(r => r.invoice.id === updated.id ? { ...r, invoice: updated } : r));
    }
  };

  const openDetail = async (row: InvoiceRow) => {
    navigate(`/invoices/${row.invoice.id}`);
    const res = await fetch(`/api/invoices/${row.invoice.id}`);
    setSelectedInv(await res.json() as Invoice);
    setSelectedJobName(row.jobName);
  };

  return (
    <>
      <Helmet>
        <title>Invoices – Dust to Done</title>
        <meta name="description" content="Create and manage invoices with line items, labor and materials breakdown, PDF export, and payment status tracking." />
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
              const active = id === 'invoices';
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Invoices</h1>
              <p className="text-xs text-muted-foreground">{rows.length} total</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52" />
              </div>
              <NotificationBell />
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setEditingInv(null); setSelectedInv(null); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {!showForm && !editingInv && !selectedInv && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className="text-sm font-bold tabular-nums text-amber-400">{fmtCurrency(totalOutstanding)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Paid</p>
                  <p className="text-sm font-bold tabular-nums text-green-400">{fmtCurrency(totalPaid)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Overdue</p>
                  <p className="text-sm font-bold tabular-nums text-red-400">{fmtCurrency(totalOverdue)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Draft</p>
                  <p className="text-sm font-bold tabular-nums text-muted-foreground">{draftCount} invoice{draftCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {showForm && !editingInv && (
                <motion.div key="new-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>New Invoice</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <InvoiceForm jobs={jobs} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
                </motion.div>
              )}

              {editingInv && (
                <motion.div key="edit-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit {editingInv.invoiceNumber}</h2>
                    <button onClick={() => setEditingInv(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <InvoiceForm initial={editingInv} jobs={jobs} onSave={handleUpdate} onCancel={() => setEditingInv(null)} saving={saving} error={formError} />
                </motion.div>
              )}

              {selectedInv && !editingInv && !showForm && (
                <motion.div key={`detail-${selectedInv.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <DetailView
                    inv={selectedInv}
                    jobName={selectedJobName}
                    onEdit={() => { setEditingInv(selectedInv); setFormError(null); }}
                    onDelete={() => handleDelete(selectedInv)}
                    onBack={() => { setSelectedInv(null); navigate('/invoices'); }}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              )}

              {!selectedInv && !showForm && !editingInv && (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{search || filterStatus !== 'all' ? 'No invoices match your filters.' : 'No invoices yet. Create your first invoice.'}</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-2">Invoice #</div>
                        <div className="col-span-3">Client</div>
                        <div className="col-span-2">Job</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-2">Due Date</div>
                      </div>
                      <div className="divide-y divide-border">
                        {filtered.map(row => (
                          <div key={row.invoice.id} onClick={() => openDetail(row)}
                            className="grid grid-cols-12 gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors items-center">
                            <div className="col-span-2 text-sm font-semibold text-foreground">{row.invoice.invoiceNumber}</div>
                            <div className="col-span-3 text-sm text-muted-foreground truncate">{row.invoice.clientName}</div>
                            <div className="col-span-2 text-xs text-muted-foreground truncate">{row.jobName ?? '—'}</div>
                            <div className="col-span-2"><StatusBadge status={row.invoice.status} /></div>
                            <div className="col-span-1 text-right text-sm font-bold text-foreground tabular-nums">{fmtCurrency(row.invoice.total)}</div>
                            <div className={`col-span-2 text-sm ${row.invoice.status === 'overdue' ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                              {row.invoice.dueDate ?? '—'}
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
