import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useParams, useNavigate } from 'react-router';
import { takeoff_detail } from 'virtual:content';
import { ArrowLeft, Upload, Sparkles, Plus, Trash2, Pencil, Check, X, Loader2, AlertCircle, AlertTriangle, Download, FileSpreadsheet, Camera, DollarSign, Printer, Info, CheckCircle2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface TakeoffProject {
  id: number;
  projectName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string | null;
  description: string | null;
  dimensions: string | null;
  status: 'draft' | 'analyzed' | 'complete';
  notes: string | null;
  createdAt: string;
}

interface TakeoffPhoto {
  id: number;
  projectId: number;
  filename: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  aiCaption: string | null;
  uploadedAt: string;
}

interface TakeoffMaterial {
  id: number;
  projectId: number;
  category: string;
  name: string;
  description: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  wastePercent: string;
  extendedPrice: string;
  supplier: string | null;
  productInfo: string | null;
  priceSource: string | null;
  priceDate: string | null;
  productLink: string | null;
  aiGenerated: number;
  sortOrder: number;
}

interface TakeoffEstimate {
  id: number;
  projectId: number;
  materialSubtotal: string;
  wasteAllowance: string;
  laborCost: string;
  laborNotes: string | null;
  salesTaxRate: string;
  salesTax: string;
  markupPercent: string;
  markupAmount: string;
  totalEstimate: string;
  notes: string | null;
}

interface AIResult {
  materials: {
    category: string; name: string; description: string; quantity: number; unit: string;
    unitPrice: number; wastePercent: number; supplier: string; productInfo: string;
    confidence: 'visual' | 'inferred' | 'manual'; notes: string; priceDisclaimer?: string;
  }[];
  missingMeasurements: string[];
  analysisNotes: string;
  photoSummary: string;
  photoCount: number;
  priceDisclaimer?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCur = (v: string | number) =>
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const CATEGORIES = [
  'Lumber/Framing', 'Drywall', 'Insulation', 'Flooring', 'Tile', 'Roofing',
  'Siding', 'Plumbing', 'Electrical', 'HVAC', 'Paint', 'Cabinets',
  'Countertops', 'Doors/Windows', 'Trim/Molding', 'Fasteners/Hardware',
  'Adhesives/Compounds', 'Miscellaneous',
];

const UNITS = ['ea', 'lf', 'sf', 'sy', 'cf', 'cy', 'lb', 'ton', 'gal', 'qt', 'bag', 'box', 'roll', 'sheet', 'stick', 'bundle', 'sq', 'hr'];

const SUPPLIERS = [
  takeoff_detail.supplierMenards,
  takeoff_detail.supplierLowes,
  takeoff_detail.supplierOther,
];

const CONFIDENCE_COLORS: Record<string, string> = {
  visual: 'bg-green-500/15 text-green-400 border-green-500/30',
  inferred: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  manual: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  visual: takeoff_detail.confidenceVisual,
  inferred: takeoff_detail.confidenceInferred,
  manual: takeoff_detail.confidenceManual,
};

const EMPTY_MAT = {
  category: 'Miscellaneous', name: '', description: '', quantity: '1', unit: 'ea',
  unitPrice: '0', wastePercent: '10', supplier: '', productInfo: '', productLink: '', priceSource: '', priceDate: '',
};

// ─── Material Row (inline edit) ───────────────────────────────────────────────

interface MatRowProps {
  mat: TakeoffMaterial;
  onUpdate: (id: number, data: Partial<typeof EMPTY_MAT>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function MatRow({ mat, onUpdate, onDelete }: MatRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    category: mat.category, name: mat.name, description: mat.description ?? '',
    quantity: mat.quantity, unit: mat.unit, unitPrice: mat.unitPrice,
    wastePercent: mat.wastePercent, supplier: mat.supplier ?? '', productInfo: mat.productInfo ?? '',
    productLink: mat.productLink ?? '', priceSource: mat.priceSource ?? '', priceDate: mat.priceDate ?? '',
  });
  const [saving, setSaving] = useState(false);

  type FormKey = keyof typeof form;
  const setF = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(mat.id, form);
    setSaving(false);
    setEditing(false);
  };

  const inputCls = 'w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  if (editing) {
    return (
      <tr className="bg-muted/30">
        <td className="px-2 py-2" colSpan={9}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Category</label>
              <select className={inputCls} value={form.category} onChange={setF('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-0.5">Material Name *</label>
              <input className={inputCls} value={form.name} onChange={setF('name')} placeholder="e.g. 1/2in Drywall 4x8" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Supplier</label>
              <select className={inputCls} value={form.supplier} onChange={setF('supplier')}>
                <option value="">— Select —</option>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Qty</label>
              <input className={inputCls} type="number" min="0" step="0.001" value={form.quantity} onChange={setF('quantity')} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Unit</label>
              <select className={inputCls} value={form.unit} onChange={setF('unit')}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Unit Price ($)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.unitPrice} onChange={setF('unitPrice')} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Waste %</label>
              <input className={inputCls} type="number" min="0" max="100" step="1" value={form.wastePercent} onChange={setF('wastePercent')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-0.5">Description / Product Info</label>
              <input className={inputCls} value={form.productInfo} onChange={setF('productInfo')} placeholder="SKU, brand, specs…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-0.5">Product Link (URL)</label>
              <input className={inputCls} value={form.productLink} onChange={setF('productLink')} placeholder="https://www.menards.com/…" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Price Source</label>
              <input className={inputCls} value={form.priceSource} onChange={setF('priceSource')} placeholder="e.g. Estimated - Menards TH" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-0.5">Price Date</label>
              <input className={inputCls} value={form.priceDate} onChange={setF('priceDate')} placeholder="MM/DD/YYYY" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void handleSave()} disabled={saving || !form.name}
              className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  const extended = Number(mat.quantity) * Number(mat.unitPrice) * (1 + Number(mat.wastePercent) / 100);

  return (
    <tr className="border-t border-border hover:bg-muted/20 transition-colors group">
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground">{mat.category}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {mat.aiGenerated === 1 && (
            <span className="flex-shrink-0 text-xs bg-primary/20 text-primary border border-primary/30 rounded px-1 py-0.5 font-semibold">{takeoff_detail.aiGeneratedBadge}</span>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{mat.name}</p>
            {mat.productInfo && <p className="text-xs text-muted-foreground">{mat.productInfo}</p>}
            {mat.productLink && (
              <a href={mat.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[180px] block">
                View product
              </a>
            )}
            {(mat.priceSource || mat.priceDate) && (
              <p className="text-xs text-muted-foreground/60 italic">
                {mat.priceSource}{mat.priceDate ? ` · ${mat.priceDate}` : ""}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums">{Number(mat.quantity).toLocaleString()}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{mat.unit}</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums">{fmtCur(mat.unitPrice)}</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums text-muted-foreground">{mat.wastePercent}%</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums font-semibold text-foreground">{fmtCur(extended)}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">{mat.supplier ?? '—'}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => void onDelete(mat.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TakeoffDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<TakeoffProject | null>(null);
  const [photos, setPhotos] = useState<TakeoffPhoto[]>([]);
  const [materials, setMaterials] = useState<TakeoffMaterial[]>([]);
  const [, setEstimate] = useState<TakeoffEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // AI analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Material add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_MAT });
  const [addSaving, setAddSaving] = useState(false);

  // Estimate panel
  const [estForm, setEstForm] = useState({
    laborCost: '120.00', laborNotes: '', salesTaxRate: '7.000', markupPercent: '15', notes: '',
  });
  const [estSaving, setEstSaving] = useState(false);
  const [estSaved, setEstSaved] = useState(false);

  // PDF print
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetch(`/api/takeoff/${projectId}`).then(r => r.json()) as {
        project: TakeoffProject; photos: TakeoffPhoto[]; materials: TakeoffMaterial[]; estimate: TakeoffEstimate | null;
      };
      setProject(data.project);
      setPhotos(data.photos ?? []);
      setMaterials(data.materials ?? []);
      if (data.estimate) {
        setEstimate(data.estimate);
        setEstForm({
          laborCost: data.estimate.laborCost,
          laborNotes: data.estimate.laborNotes ?? '',
          salesTaxRate: data.estimate.salesTaxRate,
          markupPercent: data.estimate.markupPercent,
          notes: data.estimate.notes ?? '',
        });
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  // ── Photo upload ──────────────────────────────────────────────────────────

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !projectId) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('photos', f);
    try {
      const res = await fetch(`/api/takeoff/${projectId}/photos`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const newPhotos = await res.json() as TakeoffPhoto[];
      setPhotos(p => [...p, ...newPhotos]);
    } catch (e) {
      setUploadError(String(e));
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (id: number) => {
    if (!confirm(takeoff_detail.photoDeleteConfirm)) return;
    await fetch(`/api/takeoff/${projectId}/photos/${id}`, { method: 'DELETE' });
    setPhotos(p => p.filter(x => x.id !== id));
  };

  // ── AI Analysis ───────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!projectId) return;
    if (materials.length > 0 && !confirm(takeoff_detail.analyzeConfirm)) return;
    setAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch(`/api/takeoff/${projectId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json() as { error: string; message?: string };
        throw new Error(err.message ?? err.error);
      }
      const result = await res.json() as AIResult;
      setAiResult(result);
      setShowAiPanel(true);
      // Update project status
      await fetch(`/api/takeoff/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, status: 'analyzed' }),
      });
      setProject(p => p ? { ...p, status: 'analyzed' } : p);
    } catch (e) {
      setAiError(String(e));
    }
    setAnalyzing(false);
  };

  const handleApplyAI = async () => {
    if (!aiResult || !projectId) return;
    const items = aiResult.materials.map((m, i) => ({
      category: m.category,
      name: m.name,
      description: m.description,
      quantity: String(m.quantity),
      unit: m.unit,
      unitPrice: String(m.unitPrice),
      wastePercent: String(m.wastePercent),
      supplier: m.supplier || '',
      productInfo: m.productInfo || '',
      priceSource: "Estimated - Menards/Lowe's TH (verify before ordering)",
      priceDate: new Date().toLocaleDateString(),
      productLink: '',
      aiGenerated: 1,
      sortOrder: i,
    }));
    const res = await fetch(`/api/takeoff/${projectId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replace: true, items }),
    });
    const saved = await res.json() as TakeoffMaterial[];
    setMaterials(saved);
    setShowAiPanel(false);
    // auto-save estimate totals
    void handleSaveEstimate(saved);
  };

  // ── Materials CRUD ────────────────────────────────────────────────────────

  const handleAddMaterial = async () => {
    if (!addForm.name || !projectId) return;
    setAddSaving(true);
    const res = await fetch(`/api/takeoff/${projectId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ ...addForm, aiGenerated: 0 }] }),
    });
    const saved = await res.json() as TakeoffMaterial[];
    setMaterials(m => [...m, ...saved]);
    setAddForm({ ...EMPTY_MAT });
    setShowAddForm(false);
    setAddSaving(false);
  };

  const handleUpdateMaterial = async (id: number, data: Partial<typeof EMPTY_MAT>) => {
    if (!projectId) return;
    const res = await fetch(`/api/takeoff/${projectId}/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json() as TakeoffMaterial;
    setMaterials(m => m.map(x => x.id === id ? updated : x));
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm(takeoff_detail.deleteConfirm)) return;
    await fetch(`/api/takeoff/${projectId}/materials/${id}`, { method: 'DELETE' });
    setMaterials(m => m.filter(x => x.id !== id));
  };

  // ── Estimate ──────────────────────────────────────────────────────────────

  const calcEstimate = (mats: TakeoffMaterial[], form: typeof estForm) => {
    const materialSubtotal = mats.reduce((s, m) => s + Number(m.quantity) * Number(m.unitPrice), 0);
    const wasteAllowance = mats.reduce((s, m) => s + Number(m.quantity) * Number(m.unitPrice) * (Number(m.wastePercent) / 100), 0);
    const labor = Number(form.laborCost) || 0;
    const taxBase = materialSubtotal + wasteAllowance;
    const salesTax = taxBase * (Number(form.salesTaxRate) / 100);
    const markupBase = materialSubtotal + wasteAllowance + labor + salesTax;
    const markupAmount = markupBase * (Number(form.markupPercent) / 100);
    const total = markupBase + markupAmount;
    return { materialSubtotal, wasteAllowance, laborCost: labor, salesTax, markupAmount, totalEstimate: total };
  };

  const handleSaveEstimate = async (mats?: TakeoffMaterial[]) => {
    if (!projectId) return;
    setEstSaving(true);
    const useMats = mats ?? materials;
    const calc = calcEstimate(useMats, estForm);
    const body = {
      materialSubtotal: String(Math.round(calc.materialSubtotal * 100) / 100),
      wasteAllowance: String(Math.round(calc.wasteAllowance * 100) / 100),
      laborCost: estForm.laborCost,
      laborNotes: estForm.laborNotes,
      salesTaxRate: estForm.salesTaxRate,
      salesTax: String(Math.round(calc.salesTax * 100) / 100),
      markupPercent: estForm.markupPercent,
      markupAmount: String(Math.round(calc.markupAmount * 100) / 100),
      totalEstimate: String(Math.round(calc.totalEstimate * 100) / 100),
      notes: estForm.notes,
    };
    const res = await fetch(`/api/takeoff/${projectId}/estimate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const saved = await res.json() as TakeoffEstimate;
    setEstimate(saved);
    setEstSaving(false);
    setEstSaved(true);
    setTimeout(() => setEstSaved(false), 2000);
  };

  const calc = calcEstimate(materials, estForm);

  // ── CSV Export ────────────────────────────────────────────────────────────

  const handleExportCsv = () => {
    window.open(`/api/takeoff/${projectId}/export-csv`, '_blank');
  };

  // ── Print / PDF ───────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  // ── Grouped materials ─────────────────────────────────────────────────────

  const grouped = materials.reduce<Record<string, TakeoffMaterial[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  if (loading) return (
    <main className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </main>
  );

  if (error || !project) return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-center">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
      <p className="text-foreground font-semibold mb-2">Project not found</p>
      <button onClick={() => void navigate('/takeoff')} className="text-primary hover:underline text-sm">
        ← Back to projects
      </button>
    </main>
  );

  return (
    <>
      <Helmet>
        <title>{project.projectName} {takeoff_detail.metaTitleSuffix}</title>
        <meta name="description" content={`Material takeoff for ${project.projectName} — ${project.customerName}`} />
      </Helmet>

      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .print-area { padding: 0 !important; }
        }
        .print-only { display: none; }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 py-6 print-area" ref={printRef}>
        {/* ── Header ── */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => void navigate('/takeoff')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> <span>{takeoff_detail.backButton}</span>
            </button>
            <span className="text-border">|</span>
            <div>
              <h1 className="text-xl font-bold text-foreground font-[Barlow]">{project.projectName}</h1>
              <p className="text-sm text-muted-foreground">{project.customerName}{project.address ? ` · ${project.address}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExportCsv} className="flex items-center gap-1.5 text-xs border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> <span>{takeoff_detail.exportCsvButton}</span>
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> <span>{takeoff_detail.exportPdfButton}</span>
            </button>
          </div>
        </div>

        {/* ── Print header ── */}
        <div className="print-only mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold">Dust to Done Renovation Solutions LLC</h1>
          <h2 className="text-xl mt-1">Material Takeoff: {project.projectName}</h2>
          <p>Customer: {project.customerName} | Date: {new Date().toLocaleDateString()}</p>
          {project.address && <p>Address: {project.address}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: Photos + AI ── */}
          <div className="lg:col-span-1 space-y-4 no-print">

            {/* Project info card */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Project Info</h3>
              {project.description && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{project.description}</p>
                </div>
              )}
              {project.dimensions && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Dimensions / Measurements</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{project.dimensions}</p>
                </div>
              )}
              {project.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{project.notes}</p>
                </div>
              )}
            </div>

            {/* Photos panel */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" /> <span>{takeoff_detail.sectionPhotos}</span>
                  {photos.length > 0 && <span className="text-foreground">({photos.length})</span>}
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 rounded-lg transition-colors font-semibold disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  <span>{photos.length > 0 ? takeoff_detail.addMorePhotosButton : takeoff_detail.uploadPhotosButton}</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => void handlePhotoUpload(e.target.files)} />
              </div>

              {/* Drop zone */}
              <div
                className={`p-3 transition-colors ${dragOver ? 'bg-primary/10' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); void handlePhotoUpload(e.dataTransfer.files); }}
              >
                {uploadError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-xs text-red-400 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
                  </div>
                )}
                {photos.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>{takeoff_detail.noPhotosText}</p>
                    <p className="mt-1 text-xs opacity-60">Drag & drop or click Upload</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                        <img
                          src={`/airo-assets/uploads/takeoff/${photo.filename}`}
                          alt={photo.originalName ?? 'Photo'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <button
                            onClick={() => void handleDeletePhoto(photo.id)}
                            className="pointer-events-auto p-1.5 bg-red-500 rounded-full text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {photo.originalName && (
                          <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1.5 py-0.5 truncate">{photo.originalName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis trigger */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{takeoff_detail.sectionAnalyze}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                GPT-4o will analyze your project description, measurements, and photos to generate a complete material list.
              </p>
              {aiError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-xs text-red-400 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {aiError}
                </div>
              )}
              <button
                onClick={() => void handleAnalyze()}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{analyzing ? takeoff_detail.analyzingText : takeoff_detail.analyzeButton}</span>
              </button>
            </div>

            {/* AI Result panel */}
            {aiResult && showAiPanel && (
              <div className="bg-card border border-primary/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">AI Results</span>
                    <span className="text-xs text-muted-foreground">({aiResult.materials.length} items)</span>
                  </div>
                  <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {aiResult.photoSummary && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{takeoff_detail.photoSummaryTitle}</p>
                      <p className="text-xs text-foreground">{aiResult.photoSummary}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">
                      <span className="font-semibold">Prices are estimates only.</span> Based on typical Menards/Lowe's Terre Haute pricing. Not live prices. Verify before ordering and use the pencil icon to override any price.
                    </p>
                  </div>
                  {aiResult.missingMeasurements.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                        <p className="text-xs font-semibold text-yellow-400">{takeoff_detail.missingMeasurementsTitle}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{takeoff_detail.missingMeasurementsNote}</p>
                      <ul className="space-y-1">
                        {aiResult.missingMeasurements.map((m, i) => (
                          <li key={i} className="text-xs text-yellow-300 flex items-start gap-1.5">
                            <span className="text-yellow-500 mt-0.5">•</span> {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResult.analysisNotes && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                        <p className="text-xs font-semibold text-blue-400">{takeoff_detail.analysisNotesTitle}</p>
                      </div>
                      <p className="text-xs text-foreground">{aiResult.analysisNotes}</p>
                    </div>
                  )}
                  {/* Preview top 5 items */}
                  <div className="space-y-1.5">
                    {aiResult.materials.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs mr-1.5 ${CONFIDENCE_COLORS[m.confidence]}`}>
                            {CONFIDENCE_LABELS[m.confidence]}
                          </span>
                          <span className="text-foreground font-medium">{m.name}</span>
                          <span className="text-muted-foreground ml-1">({m.quantity} {m.unit})</span>
                        </div>
                        <span className="text-primary font-semibold flex-shrink-0">{fmtCur(m.unitPrice)}</span>
                      </div>
                    ))}
                    {aiResult.materials.length > 5 && (
                      <p className="text-xs text-muted-foreground">…and {aiResult.materials.length - 5} more items</p>
                    )}
                  </div>
                  <button
                    onClick={() => void handleApplyAI()}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" /> <span>{takeoff_detail.applyMaterialsButton}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: Materials + Estimate ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Materials table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <span>{takeoff_detail.sectionMaterials}</span>
                  {materials.length > 0 && <span className="text-foreground">({materials.length})</span>}
                </h3>
                <button
                  onClick={() => setShowAddForm(f => !f)}
                  className="flex items-center gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  <Plus className="w-3 h-3" /> <span>{takeoff_detail.addMaterialButton}</span>
                </button>
              </div>

              {/* Add form */}
              {showAddForm && (
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className={labelCls}>Category</label>
                      <select className={inputCls} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Material Name *</label>
                      <input className={inputCls} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 1/2in Drywall 4x8 Sheet" />
                    </div>
                    <div>
                      <label className={labelCls}>Supplier</label>
                      <select className={inputCls} value={addForm.supplier} onChange={e => setAddForm(f => ({ ...f, supplier: e.target.value }))}>
                        <option value="">— Select —</option>
                        {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Qty</label>
                      <input className={inputCls} type="number" min="0" step="0.001" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Unit</label>
                      <select className={inputCls} value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Unit Price ($)</label>
                      <input className={inputCls} type="number" min="0" step="0.01" value={addForm.unitPrice} onChange={e => setAddForm(f => ({ ...f, unitPrice: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Waste %</label>
                      <input className={inputCls} type="number" min="0" max="100" value={addForm.wastePercent} onChange={e => setAddForm(f => ({ ...f, wastePercent: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Product Info / SKU</label>
                      <input className={inputCls} value={addForm.productInfo} onChange={e => setAddForm(f => ({ ...f, productInfo: e.target.value }))} placeholder="Brand, SKU, specs…" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Product Link (URL)</label>
                      <input className={inputCls} value={addForm.productLink} onChange={e => setAddForm(f => ({ ...f, productLink: e.target.value }))} placeholder="https://www.menards.com/…" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void handleAddMaterial()} disabled={addSaving || !addForm.name}
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
                      {addSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">Cancel</button>
                  </div>
                </div>
              )}

              {materials.some(m => m.aiGenerated === 1) && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">
                    <span className="font-semibold">Estimated prices only.</span> AI-generated prices are based on typical Menards/Lowe's Terre Haute pricing and are not live. Verify current prices before ordering. Click the pencil icon on any row to override a price.
                  </p>
                </div>
              )}
              {materials.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>{takeoff_detail.noMaterialsText}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{takeoff_detail.colCategory}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{takeoff_detail.colMaterial}</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">{takeoff_detail.colQty}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{takeoff_detail.colUnit}</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">{takeoff_detail.colUnitPrice}</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">{takeoff_detail.colWaste}</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">{takeoff_detail.colExtended}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{takeoff_detail.colSupplier}</th>
                        <th className="px-3 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grouped).map(([cat, items]) => (
                        <>
                          <tr key={`cat-${cat}`} className="bg-muted/10">
                            <td colSpan={9} className="px-3 py-1.5">
                              <span className="text-xs font-bold text-primary uppercase tracking-wide">{cat}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {fmtCur(items.reduce((s, m) => s + Number(m.quantity) * Number(m.unitPrice) * (1 + Number(m.wastePercent) / 100), 0))}
                              </span>
                            </td>
                          </tr>
                          {items.map(mat => (
                            <MatRow key={mat.id} mat={mat} onUpdate={handleUpdateMaterial} onDelete={handleDeleteMaterial} />
                          ))}
                        </>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td colSpan={6} className="px-3 py-3 text-sm font-bold text-muted-foreground text-right">Material Subtotal</td>
                        <td className="px-3 py-3 text-sm font-bold text-foreground text-right tabular-nums">{fmtCur(calc.materialSubtotal)}</td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr className="border-t border-border">
                        <td colSpan={6} className="px-3 py-2 text-xs text-muted-foreground text-right">Waste Allowance</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground text-right tabular-nums">{fmtCur(calc.wasteAllowance)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Estimate panel */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> <span>{takeoff_detail.sectionEstimate}</span>
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>{takeoff_detail.labelTaxRate}</label>
                    <input className={inputCls} type="number" min="0" max="20" step="0.001" value={estForm.salesTaxRate}
                      onChange={e => setEstForm(f => ({ ...f, salesTaxRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>{takeoff_detail.labelMarkupPct}</label>
                    <input className={inputCls} type="number" min="0" max="200" step="1" value={estForm.markupPercent}
                      onChange={e => setEstForm(f => ({ ...f, markupPercent: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>{takeoff_detail.labelLaborCost}</label>
                    <input className={inputCls} type="number" min="0" step="0.01" value={estForm.laborCost}
                      onChange={e => setEstForm(f => ({ ...f, laborCost: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={labelCls}>{takeoff_detail.labelLaborNotes}</label>
                    <input className={inputCls} value={estForm.laborNotes}
                      onChange={e => setEstForm(f => ({ ...f, laborNotes: e.target.value }))}
                      placeholder="Demo, framing, drywall, finish work…" />
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2 mb-4">
                  {[
                    { label: takeoff_detail.labelMaterialSubtotal, value: calc.materialSubtotal },
                    { label: takeoff_detail.labelWasteAllowance, value: calc.wasteAllowance },
                    { label: takeoff_detail.labelLaborCost, value: Number(estForm.laborCost) },
                    { label: `${takeoff_detail.labelSalesTax} (${estForm.salesTaxRate}%)`, value: calc.salesTax },
                    { label: `${takeoff_detail.labelMarkup} (${estForm.markupPercent}%)`, value: calc.markupAmount },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums text-foreground">{fmtCur(value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-bold text-foreground">{takeoff_detail.labelTotal}</span>
                    <span className="text-xl font-bold text-primary tabular-nums">{fmtCur(calc.totalEstimate)}</span>
                  </div>
                </div>

                <button
                  onClick={() => void handleSaveEstimate()}
                  disabled={estSaving}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {estSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : estSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
                  <span>{estSaved ? 'Saved!' : takeoff_detail.saveEstimateButton}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
