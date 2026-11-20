import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, FileText, ClipboardList, FolderOpen, Users, BarChart3, Settings,
  BookOpen, Tag, RefreshCw, CheckCircle, AlertTriangle, Clock, ExternalLink, ChevronDown, ChevronUp,
  Search, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, History,
} from 'lucide-react';
import { supplier_pricing as c } from 'virtual:content';

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       id: 'dashboard',          path: '/' },
  { icon: HardHat,         label: 'Jobs & Projects', id: 'jobs',               path: '/jobs' },
  { icon: ClipboardList,   label: 'Estimates',       id: 'estimates',          path: '/estimates' },
  { icon: Receipt,         label: 'Expenses',        id: 'expenses',           path: '/expenses' },
  { icon: FileText,        label: 'Invoices',        id: 'invoices',           path: '/invoices' },
  { icon: Tag,             label: 'Payments',        id: 'payments',           path: '/payments' },
  { icon: FolderOpen,      label: 'Documents',       id: 'documents',          path: '/documents' },
  { icon: Users,           label: 'Vendors',         id: 'vendors',            path: '/vendors' },
  { icon: BarChart3,       label: 'Reports',         id: 'reports',            path: '/reports' },
  { icon: BookOpen,        label: 'Price Library',   id: 'price-library',      path: '/price-library' },
  { icon: RefreshCw,       label: 'Supplier Prices', id: 'supplier-pricing',   path: '/supplier-pricing' },
  { icon: Settings,        label: 'Settings',        id: 'settings',           path: '/settings' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderStatus {
  supplier: string;
  connectionStatus: 'connected' | 'awaiting_authorization' | 'error' | 'unconfigured';
  message: string;
  lastChecked: string;
}

interface StatusResponse {
  live: { menards: ProviderStatus; lowes: ProviderStatus };
  stored: StoredStatus[];
}

interface StoredStatus {
  id: number;
  supplier: string;
  connectionStatus: string;
  lastSuccessfulCheck: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

interface RefreshRun {
  id: number;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  materialsChecked: number;
  pricesUpdated: number;
  priceIncreases: number;
  priceDecreases: number;
  failures: number;
  errorDetails: string | null;
}

interface PriceLibraryItem {
  id: number;
  name: string;
  unit: string;
  unitPrice: string;
  category: string;
  vendor: string | null;
  sku: string | null;
}

interface SupplierPriceRow {
  id: number;
  materialId: number;
  supplier: string;
  storeLocation: string;
  retailerProductId: string | null;
  sku: string | null;
  productName: string | null;
  unit: string | null;
  unitPrice: string | null;
  productUrl: string | null;
  verifiedAt: string | null;
  availabilityStatus: string;
  matchConfidence: string;
}

interface CompareResponse {
  material: PriceLibraryItem;
  menards: SupplierPriceRow | null;
  lowes: SupplierPriceRow | null;
  comparison: {
    selectedPrice: number | null;
    selectedSupplier: string | null;
    comparisonStatus: string;
  };
}

interface PriceHistoryRow {
  id: number;
  materialId: number;
  supplier: string;
  unitPrice: string;
  selectedEstimatePrice: string | null;
  selectedSupplier: string | null;
  comparisonStatus: string;
  recordedAt: string;
}

interface LiveProduct {
  supplier: string;
  retailerProductId: string;
  sku?: string;
  productName: string;
  unit: string;
  unitPrice: number;
  productUrl?: string;
  storeLocation: string;
  verifiedAt: string;
  category: string;
  isLikelyMatch: boolean;
  matchNote: string;
  classification: {
    treatment: string;
    species: string;
    grade: string;
    dimensions: string[];
  };
}

interface GroupedSearchResult {
  category: string;
  label: string;
  description: string;
  products: LiveProduct[];
}

interface SearchResponse {
  query: string;
  queryCategory: string;
  queryDimensions: string[];
  isSku?: boolean;
  supplierFilter?: 'menards' | 'lowes' | 'both';
  menards: LiveProduct[];
  lowes: LiveProduct[];
  grouped: GroupedSearchResult[];
  likelyMatches: { menards: LiveProduct[]; lowes: LiveProduct[] };
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | string | null): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function nextRefreshTime(): string {
  const now = new Date();
  const next = new Date();
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusColor(s: string): string {
  if (s === 'connected') return 'text-green-400';
  if (s === 'awaiting_authorization') return 'text-yellow-400';
  if (s === 'error') return 'text-red-400';
  return 'text-muted-foreground';
}

function statusIcon(s: string) {
  if (s === 'connected') return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (s === 'awaiting_authorization') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (s === 'error') return <WifiOff className="w-4 h-4 text-red-400" />;
  return <Wifi className="w-4 h-4 text-muted-foreground" />;
}

function comparisonBadge(status: string) {
  if (status === 'complete') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">Complete</span>;
  if (status === 'incomplete') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">Incomplete</span>;
  if (status === 'unit_mismatch') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400">Unit Mismatch</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Unavailable</span>;
}

// ─── Estimate Summary (for picker) ──────────────────────────────────────────

interface EstimateSummary {
  id: number;
  estimateNumber: string;
  clientName: string;
  status: string;
}

// ─── Select Product Button ────────────────────────────────────────────────────

interface SelectProductButtonProps {
  product: LiveProduct;
  materials: PriceLibraryItem[];
  onSelect: (materialId: number, product: LiveProduct, confidence: 'high' | 'medium' | 'low', matchReason: string) => Promise<void>;
  selectingId: string | null;
}

function SelectProductButton({ product, materials, onSelect, selectingId }: SelectProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  const handleConfirm = async () => {
    if (!selectedMaterialId) return;
    const confidence = product.isLikelyMatch ? 'high' : 'low';
    const matchReason = product.matchNote || (product.isLikelyMatch ? 'Manually selected as equivalent' : 'Manually selected — verify equivalence');
    await onSelect(selectedMaterialId, product, confidence, matchReason);
    setOpen(false);
    setSelectedMaterialId(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 hover:bg-muted transition-colors whitespace-nowrap"
      >
        Use as price
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <select
        value={selectedMaterialId ?? ''}
        onChange={e => setSelectedMaterialId(Number(e.target.value) || null)}
        className="text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground"
      >
        <option value="">Select material…</option>
        {materials.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <button
        onClick={handleConfirm}
        disabled={!selectedMaterialId || selectingId === product.retailerProductId}
        className="text-xs bg-primary text-primary-foreground rounded px-2 py-0.5 disabled:opacity-50 whitespace-nowrap"
      >
        {selectingId === product.retailerProductId ? 'Saving…' : 'Save'}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
    </div>
  );
}

// ─── Add to Estimate Button ──────────────────────────────────────────────────

interface AddToEstimateButtonProps {
  product: LiveProduct;
  estimates: EstimateSummary[];
}

function AddToEstimateButton({ product, estimates: estimateOptions }: AddToEstimateButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const handleAdd = async () => {
    if (!selectedEstimateId) return;
    setSaving(true);
    setErrMsg('');
    try {
      const r = await fetch('/api/estimates/' + selectedEstimateId + '/add-line-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: product.productName + (product.sku ? ' (SKU: ' + product.sku + ')' : '') + ' — ' + product.supplier,
          category: 'materials',
          quantity: Number(qty) || 1,
          unit: product.unit || 'each',
          unitPrice: product.unitPrice,
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error?: string };
        setErrMsg(d.error ?? 'Failed to add');
      } else {
        const chosen = estimateOptions.find(e => e.id === selectedEstimateId);
        setDoneMsg('Added to ' + (chosen ? chosen.estimateNumber : 'estimate') + '!');
        setTimeout(() => { setDoneMsg(''); setOpen(false); setSelectedEstimateId(null); setQty('1'); }, 2000);
      }
    } catch {
      setErrMsg('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (doneMsg) {
    return <span className="text-xs text-green-400 font-semibold whitespace-nowrap">{doneMsg}</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={estimateOptions.length === 0}
        title={estimateOptions.length === 0 ? 'No draft estimates available' : 'Add to an estimate'}
        className="text-xs text-primary hover:text-primary/80 border border-primary/40 hover:border-primary rounded px-2 py-0.5 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Estimate
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px] bg-card border border-border rounded-md p-2 shadow-lg z-10">
      <div className="text-xs font-semibold text-foreground truncate max-w-[200px]">{product.productName}</div>
      <div className="text-xs text-muted-foreground">{product.supplier} · {product.unitPrice > 0 ? '$' + product.unitPrice.toFixed(2) : '—'} / {product.unit}</div>
      <select
        value={selectedEstimateId ?? ''}
        onChange={e => setSelectedEstimateId(Number(e.target.value) || null)}
        className="text-xs bg-muted border border-border rounded px-1.5 py-1 text-foreground w-full"
      >
        <option value="">Select estimate…</option>
        {estimateOptions.map(e => (
          <option key={e.id} value={e.id}>{e.estimateNumber} — {e.clientName}</option>
        ))}
      </select>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Qty:</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground w-16"
        />
      </div>
      {errMsg && <div className="text-xs text-red-400">{errMsg}</div>}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleAdd}
          disabled={!selectedEstimateId || saving}
          className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50 font-semibold"
        >
          {saving ? 'Adding…' : 'Add line item'}
        </button>
        <button onClick={() => { setOpen(false); setErrMsg(''); }} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierPricingPage() {
  const navigate = useNavigate();
  const activeNav = 'supplier-pricing';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [refreshHistory, setRefreshHistory] = useState<RefreshRun[]>([]);
  const [materials, setMaterials] = useState<PriceLibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [comparisons, setComparisons] = useState<Record<number, CompareResponse>>({});
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [historyRows, setHistoryRows] = useState<Record<number, PriceHistoryRow[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  // Live Scavio search state
  const [liveQuery, setLiveQuery] = useState('');
  const [skuSupplier, setSkuSupplier] = useState<'both' | 'menards' | 'lowes'>('both');
  const [liveSearchData, setLiveSearchData] = useState<SearchResponse | null>(null);
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [selectingProduct, setSelectingProduct] = useState<string | null>(null); // retailerProductId being saved
  const [selectMsg, setSelectMsg] = useState<Record<number, string>>({}); // materialId -> message
  const [estimatesList, setEstimatesList] = useState<EstimateSummary[]>([]);

  // Detect whether the current query looks like a SKU (5+ digits or alphanumeric code with no spaces)
  const trimmedQuery = liveQuery.trim();
  const skuNumericRe = new RegExp('^[0-9]{5,}$');
  const skuAlphaRe = new RegExp('^[A-Za-z0-9][A-Za-z0-9-]{3,}$');
  const skuHasDigit = new RegExp('[0-9]');
  const skuHasSpace = new RegExp('[ \t]');
  const queryLooksSku = skuNumericRe.test(trimmedQuery) ||
    (skuAlphaRe.test(trimmedQuery) && skuHasDigit.test(trimmedQuery) && !skuHasSpace.test(trimmedQuery));

  const loadStatus = useCallback(() => {
    fetch('/api/supplier-pricing/status')
      .then(r => r.json())
      .then((d: StatusResponse) => setStatus(d))
      .catch(() => {});
  }, []);

  const loadRefreshHistory = useCallback(() => {
    fetch('/api/supplier-pricing/refresh-history?limit=10')
      .then(r => r.json())
      .then((d: RefreshRun[]) => setRefreshHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadMaterials = useCallback(() => {
    fetch('/api/price-library')
      .then(r => r.json())
      .then((d: PriceLibraryItem[]) => setMaterials(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadEstimates = useCallback(() => {
    fetch('/api/estimates')
      .then(r => r.json())
      .then((d: EstimateSummary[]) => setEstimatesList(Array.isArray(d) ? d.filter(e => e.status === 'draft' || e.status === 'sent') : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStatus();
    loadRefreshHistory();
    loadMaterials();
    loadEstimates();
  }, [loadStatus, loadRefreshHistory, loadMaterials, loadEstimates]);

  // Load comparison for each visible material
  useEffect(() => {
    const filtered = materials.filter(m =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.sku ?? '').toLowerCase().includes(search.toLowerCase()),
    );
    for (const m of filtered) {
      if (!comparisons[m.id]) {
        fetch('/api/supplier-pricing/compare?materialId=' + m.id)
          .then(r => r.json())
          .then((d: CompareResponse) => setComparisons(prev => ({ ...prev, [m.id]: d })))
          .catch(() => {});
      }
    }
  }, [materials, search, comparisons]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const r = await fetch('/api/supplier-pricing/refresh', { method: 'POST' });
      const d = await r.json() as { message?: string };
      setRefreshMsg(d.message ?? 'Refresh started');
      setTimeout(() => { loadRefreshHistory(); loadStatus(); }, 3000);
    } catch {
      setRefreshMsg('Failed to start refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = async (materialId: number) => {
    if (historyRows[materialId]) {
      setExpandedHistory(expandedHistory === materialId ? null : materialId);
      return;
    }
    const rows = await fetch('/api/supplier-pricing/history?materialId=' + materialId)
      .then(r => r.json())
      .then((d: PriceHistoryRow[]) => Array.isArray(d) ? d : [])
      .catch(() => [] as PriceHistoryRow[]);
    setHistoryRows(prev => ({ ...prev, [materialId]: rows }));
    setExpandedHistory(materialId);
  };

  const handleLiveSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = liveQuery.trim();
    if (!q) return;
    setLiveSearching(true);
    setLiveError('');
    setLiveSearchData(null);
    try {
      const numericSku = new RegExp('^[0-9]{5,}$').test(q);
      const alphaSku = new RegExp('^[A-Za-z0-9][A-Za-z0-9-]{3,}$').test(q) && new RegExp('[0-9]').test(q) && q.indexOf(' ') === -1;
      const isSku = numericSku || alphaSku;
      const params = new URLSearchParams({ q });
      if (isSku && skuSupplier !== 'both') params.set('supplier', skuSupplier);
      const r = await fetch('/api/supplier-pricing/search?' + params.toString());
      const d = await r.json() as SearchResponse;
      if (!r.ok) { setLiveError(d.error ?? 'Search failed'); return; }
      setLiveSearchData(d);
    } catch {
      setLiveError('Search failed. Please try again.');
    } finally {
      setLiveSearching(false);
    }
  };

  const handleSelectProduct = async (materialId: number, product: LiveProduct, confidence: 'high' | 'medium' | 'low', matchReason: string) => {
    setSelectingProduct(product.retailerProductId);
    try {
      const r = await fetch('/api/supplier-pricing/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, product, confidence, matchReason }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (r.ok && d.ok) {
        setSelectMsg(prev => ({ ...prev, [materialId]: `Saved ${product.supplier} price $${product.unitPrice.toFixed(2)} for this material` }));
        // Refresh the comparison for this material
        fetch('/api/supplier-pricing/compare?materialId=' + materialId)
          .then(res => res.json())
          .then((cmp: CompareResponse) => setComparisons(prev => ({ ...prev, [materialId]: cmp })))
          .catch(() => {});
      } else {
        setSelectMsg(prev => ({ ...prev, [materialId]: d.error ?? 'Failed to save' }));
      }
    } catch {
      setSelectMsg(prev => ({ ...prev, [materialId]: 'Failed to save selection' }));
    } finally {
      setSelectingProduct(null);
    }
  };

  const lastRun = refreshHistory[0] ?? null;
  const filteredMaterials = materials.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.sku ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Helmet>
        <title>{c.pageTitle} – Dust to Done</title>
        <meta name="description" content="Compare Menards and Lowe's pricing for your materials and track daily price updates." />
      </Helmet>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <img src="/airo-assets/images/logo/horizontal" alt="Dust to Done" className="h-8 w-auto object-contain" />
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map(({ icon: Icon, label, id, path }) => (
            <button
              key={id}
              onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-0.5 transition-colors ${activeNav === id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{c.pageTitle}</h1>
            <p className="text-xs text-muted-foreground">{c.pageSubtitle}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-3 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? c.refreshingLabel : c.refreshButtonLabel}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-5">
          {refreshMsg && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-md px-3 py-2 text-sm text-primary">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {refreshMsg}
            </div>
          )}

          {/* Connection Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['menards', 'lowes'] as const).map(key => {
              const live = status?.live[key];
              const label = key === 'menards' ? 'Menards' : "Lowe's";
              return (
                <div key={key} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{label}</span>
                    {live ? statusIcon(live.connectionStatus) : <Wifi className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className={`text-sm font-medium mb-1 ${live ? statusColor(live.connectionStatus) : 'text-muted-foreground'}`}>
                    {live ? live.connectionStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Loading…'}
                  </div>
                  {live && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{live.message}</p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Store: {c.storeLocation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refresh Status Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Last Refresh</div>
              <div className="text-sm font-semibold text-foreground">{lastRun ? fmtDate(lastRun.startedAt) : 'Never'}</div>
              {lastRun && <div className={`text-xs mt-0.5 ${lastRun.status === 'completed' ? 'text-green-400' : lastRun.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>{lastRun.status}</div>}
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Next Refresh</div>
              <div className="text-sm font-semibold text-foreground">{nextRefreshTime()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.nextRefreshLabel}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Materials Checked</div>
              <div className="text-2xl font-bold text-foreground">{lastRun?.materialsChecked ?? 0}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Price Changes</div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-red-400 font-bold"><TrendingUp className="w-3.5 h-3.5" />{lastRun?.priceIncreases ?? 0}</span>
                <span className="flex items-center gap-1 text-green-400 font-bold"><TrendingDown className="w-3.5 h-3.5" />{lastRun?.priceDecreases ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Live Supplier Search */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Search Materials at Menards &amp; Lowe's</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Search by product name, size, or SKU number (e.g. "2x4x8", "drywall", "1234567", "5013453")</p>
            </div>
            <div className="p-4">
              <form onSubmit={handleLiveSearch} className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    className={inputCls + ' pl-9'}
                    placeholder="Product name, size, or SKU number…"
                    value={liveQuery}
                    onChange={e => { setLiveQuery(e.target.value); setLiveSearchData(null); setLiveError(''); }}
                  />
                </div>
                {queryLooksSku && (
                  <div className="flex items-center gap-1.5 bg-muted border border-border rounded-md px-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">SKU at:</span>
                    {(['both', 'menards', 'lowes'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSkuSupplier(opt)}
                        className={'text-xs px-2 py-1 rounded transition-colors ' + (skuSupplier === opt ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground')}
                      >
                        {opt === 'both' ? 'Both' : opt === 'menards' ? 'Menards' : "Lowe's"}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={liveSearching || !liveQuery.trim()}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {liveSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {liveSearching ? 'Searching…' : 'Search'}
                </button>
              </form>

              {liveError && (
                <p className="mt-3 text-sm text-destructive">{liveError}</p>
              )}

              {/* Selection feedback messages */}
              {Object.entries(selectMsg).map(([id, msg]) => (
                <div key={id} className="mt-2 text-xs text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{msg}
                </div>
              ))}

              {liveSearchData && (
                <div className="mt-4 space-y-5">
                  {/* Query classification summary */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {liveSearchData.isSku && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">SKU lookup</span>
                    )}
                    <span>Detected:</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                      {liveSearchData.queryCategory.replace(/_/g, ' ')}
                    </span>
                    {liveSearchData.queryDimensions.length > 0 && (
                      <>
                        <span>Dimensions:</span>
                        {liveSearchData.queryDimensions.map(d => (
                          <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-foreground font-mono">{d}</span>
                        ))}
                      </>
                    )}
                    <span className="ml-auto">
                      {liveSearchData.menards.length + liveSearchData.lowes.length} total results
                    </span>
                  </div>

                  {/* Likely matches summary */}
                  {(liveSearchData.likelyMatches.menards.length > 0 || liveSearchData.likelyMatches.lowes.length > 0) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Likely equivalent products found
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(['menards', 'lowes'] as const).map(key => {
                          const matches = liveSearchData.likelyMatches[key];
                          if (matches.length === 0) return null;
                          const best = matches[0];
                          return (
                            <div key={key} className="bg-card rounded-md p-2.5 border border-border">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{best.productName}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {key === 'menards' ? 'Menards' : "Lowe's"} · SKU {best.sku ?? '—'} · {best.unit}
                                  </p>
                                </div>
                                <span className="text-sm font-bold text-foreground whitespace-nowrap">
                                  {best.unitPrice > 0 ? fmtCurrency(best.unitPrice) : '—'}
                                </span>
                              </div>
                              {best.productUrl && (
                                <a href={best.productUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1.5">
                                  View product <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grouped results */}
                  {liveSearchData.grouped.map(group => (
                    <div key={group.category}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                          {group.label}
                        </span>
                        <span className="text-xs text-muted-foreground">— {group.description}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{group.products.length} result{group.products.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Product</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Supplier</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">SKU</th>
                              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Price</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Unit</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Match</th>
                              <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.products.map((p, i) => (
                              <tr key={p.retailerProductId || i} className={`border-b border-border/50 hover:bg-muted/20 ${p.isLikelyMatch ? 'bg-green-500/5' : ''}`}>
                                <td className="px-3 py-2.5 font-medium text-foreground max-w-xs">
                                  <div className="truncate">{p.productName}</div>
                                  {p.classification.dimensions.length > 0 && (
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {p.classification.dimensions.join(' · ')}
                                      {p.classification.treatment === 'pressure_treated' && (
                                        <span className="ml-1 text-orange-400">PT</span>
                                      )}
                                      {p.classification.species !== 'unknown' && (
                                        <span className="ml-1 capitalize">{p.classification.species}</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{p.supplier}</td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{p.sku ?? '—'}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                                  {p.unitPrice > 0 ? fmtCurrency(p.unitPrice) : <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.unit}</td>
                                <td className="px-3 py-2.5">
                                  {p.isLikelyMatch ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">Equivalent</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground" title={p.matchNote}>
                                      {group.category === 'pressure_treated' ? 'PT' :
                                       group.category === 'cedar_redwood' ? 'Specialty' :
                                       group.category === 'unrelated' ? 'Unrelated' : 'Different'}
                                    </span>
                                  )}
                                  {p.matchNote && !p.isLikelyMatch && (
                                    <div className="text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate" title={p.matchNote}>{p.matchNote}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {p.productUrl && (
                                      <a href={p.productUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-0.5">
                                        View <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                    {p.unitPrice > 0 && materials.length > 0 && (
                                      <SelectProductButton
                                        product={p}
                                        materials={materials}
                                        onSelect={handleSelectProduct}
                                        selectingId={selectingProduct}
                                      />
                                    )}
                                    {p.unitPrice > 0 && (
                                      <AddToEstimateButton
                                        product={p}
                                        estimates={estimatesList}
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter search for Price Library table */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className={inputCls + ' pl-9'}
              placeholder="Filter your Price Library…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Material Price Comparison Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {c.comparisonTableTitle}
              </h2>
              <span className="text-xs text-muted-foreground">{filteredMaterials.length} items</span>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                {materials.length === 0
                  ? 'No items in your Price Library yet. Add materials in the Price Library to compare supplier prices.'
                  : 'No materials match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Menards</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lowe's</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Price</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verified</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map(m => {
                      const cmp = comparisons[m.id];
                      const isExpanded = expandedHistory === m.id;
                      const history = historyRows[m.id] ?? [];

                      return (
                        <>
                          <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.unit}{m.sku ? ' · SKU: ' + m.sku : ''}</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              {cmp?.menards ? (
                                <div>
                                  <div className="font-semibold text-foreground">{fmtCurrency(cmp.menards.unitPrice)}</div>
                                  {cmp.menards.productUrl && (
                                    <a href={cmp.menards.productUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center justify-end gap-0.5">
                                      View <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {cmp?.lowes ? (
                                <div>
                                  <div className="font-semibold text-foreground">{fmtCurrency(cmp.lowes.unitPrice)}</div>
                                  {cmp.lowes.productUrl && (
                                    <a href={cmp.lowes.productUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center justify-end gap-0.5">
                                      View <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {cmp?.comparison.selectedPrice !== null && cmp?.comparison.selectedPrice !== undefined ? (
                                <span className="font-bold text-primary">{fmtCurrency(cmp.comparison.selectedPrice)}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {cmp?.comparison.selectedSupplier ? (
                                <span className="text-xs font-medium text-foreground">{cmp.comparison.selectedSupplier}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs text-muted-foreground">
                                {cmp?.menards?.verifiedAt ? fmtDate(cmp.menards.verifiedAt) : cmp?.lowes?.verifiedAt ? fmtDate(cmp.lowes.verifiedAt) : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {cmp ? comparisonBadge(cmp.comparison.comparisonStatus) : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                onClick={() => loadHistory(m.id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                title="Price history"
                              >
                                <History className="w-3.5 h-3.5" />
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={m.id + '-history'} className="bg-muted/10">
                              <td colSpan={8} className="px-6 py-3">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Price History — {m.name}</div>
                                {history.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No price history recorded yet.</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left pb-1 pr-4">Date</th>
                                        <th className="text-left pb-1 pr-4">Supplier</th>
                                        <th className="text-right pb-1 pr-4">Price</th>
                                        <th className="text-right pb-1 pr-4">Selected</th>
                                        <th className="text-left pb-1">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {history.map((h, idx) => {
                                        const prev = history[idx + 1];
                                        const prevPrice = prev ? Number(prev.unitPrice) : null;
                                        const curPrice = Number(h.unitPrice);
                                        const diff = prevPrice !== null ? curPrice - prevPrice : null;
                                        return (
                                          <tr key={h.id} className="border-t border-border/30">
                                            <td className="py-1 pr-4 text-muted-foreground">{fmtDate(h.recordedAt)}</td>
                                            <td className="py-1 pr-4">{h.supplier}</td>
                                            <td className="py-1 pr-4 text-right font-medium">
                                              {fmtCurrency(h.unitPrice)}
                                              {diff !== null && (
                                                <span className={`ml-1 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                                                  {diff > 0 ? <TrendingUp className="w-3 h-3 inline" /> : diff < 0 ? <TrendingDown className="w-3 h-3 inline" /> : <Minus className="w-3 h-3 inline" />}
                                                  {' '}{diff > 0 ? '+' : ''}{fmtCurrency(diff)} ({diff > 0 ? '+' : ''}{prevPrice && prevPrice > 0 ? ((diff / prevPrice) * 100).toFixed(1) : '0'}%)
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-1 pr-4 text-right">{h.selectedEstimatePrice ? fmtCurrency(h.selectedEstimatePrice) : '—'}</td>
                                            <td className="py-1">{comparisonBadge(h.comparisonStatus)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Refresh History */}
          {refreshHistory.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{c.refreshHistoryTitle}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Started</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checked</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Updated</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Increases</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Failures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refreshHistory.map(run => (
                      <tr key={run.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(run.startedAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${run.status === 'completed' ? 'bg-green-500/15 text-green-400' : run.status === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">{run.materialsChecked}</td>
                        <td className="px-3 py-2.5 text-right">{run.pricesUpdated}</td>
                        <td className="px-3 py-2.5 text-right text-red-400">{run.priceIncreases}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{run.failures}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Authorization Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-400 mb-1">{c.authorizationTitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.authorizationBody}</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="bg-muted/30 rounded p-2">
                    <p className="font-semibold text-foreground mb-1">Menards</p>
                    <p>{c.menardsPro}</p>
                  </div>
                  <div className="bg-muted/30 rounded p-2">
                    <p className="font-semibold text-foreground mb-1">Lowe's</p>
                    <p>{c.lowesPro}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
