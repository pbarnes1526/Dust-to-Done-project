import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, ChevronLeft, ChevronRight, Save, Settings,
  Building2, FileSignature, CheckCircle2, AlertCircle, BookOpen,
  DollarSign, RefreshCw,
} from 'lucide-react';

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanySettings {
  id: number | null;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  logoOnPrint: number;
  defaultLaborRate: string;
  defaultOverheadPct: string;
  defaultProfitPct: string;
}

interface DocumentSettings {
  id: number | null;
  estimatePrefix: string;
  estimateYearFormat: number;
  invoicePrefix: string;
  invoiceYearFormat: number;
  estimateTerms: string;
  invoiceTerms: string;
  estimateHeaderText: string;
  estimateFooterText: string;
  invoiceHeaderText: string;
  invoiceFooterText: string;
  estimateSignatureLine: number;
  estimateEmailMessage: string;
  invoiceEmailMessage: string;
}

type Tab = 'company' | 'documents';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';
const textareaCls = inputCls + ' resize-none';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4 pb-2 border-b border-border">{children}</h3>;
}

// ─── Company Tab ─────────────────────────────────────────────────────────────

function CompanyTab({ data, onChange }: { data: CompanySettings; onChange: (d: CompanySettings) => void }) {
  const set = (field: keyof CompanySettings, value: string | number) => onChange({ ...data, [field]: value });
  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Business Identity</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Company Name</label>
            <input className={inputCls} value={data.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Dust to Done Renovation Solutions LLC" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="(317) 555-0100" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="info@dusttodone.com" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Website</label>
            <input className={inputCls} value={data.website} onChange={e => set('website', e.target.value)} placeholder="https://dusttodone.com" />
          </div>
        </div>
      </div>
      <div>
        <SectionHeading>Business Address</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Street Address</label>
            <input className={inputCls} value={data.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input className={inputCls} value={data.city} onChange={e => set('city', e.target.value)} placeholder="Indianapolis" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} value={data.state} onChange={e => set('state', e.target.value)} placeholder="IN" maxLength={2} />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input className={inputCls} value={data.zip} onChange={e => set('zip', e.target.value)} placeholder="46201" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <SectionHeading>Print Options</SectionHeading>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => set('logoOnPrint', data.logoOnPrint === 1 ? 0 : 1)}
            className={`relative w-10 h-5 rounded-full transition-colors ${data.logoOnPrint === 1 ? 'bg-primary' : 'bg-muted border border-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.logoOnPrint === 1 ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-foreground">Show company logo on printed estimates and invoices</span>
        </label>
      </div>
      <div>
        <SectionHeading>Scope Builder Defaults</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Labor Rate ($/hr)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                type="number" min="0" step="5"
                value={data.defaultLaborRate}
                onChange={e => set('defaultLaborRate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Overhead %</label>
            <div className="relative">
              <input
                className="w-full bg-muted border border-border rounded-lg px-3 pr-7 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                type="number" min="0" max="100" step="0.5"
                value={data.defaultOverheadPct}
                onChange={e => set('defaultOverheadPct', e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Profit Margin %</label>
            <div className="relative">
              <input
                className="w-full bg-muted border border-border rounded-lg px-3 pr-7 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                type="number" min="0" max="100" step="0.5"
                value={data.defaultProfitPct}
                onChange={e => set('defaultProfitPct', e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">These defaults are applied when creating new Scope Builder projects.</p>
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ data, onChange }: { data: DocumentSettings; onChange: (d: DocumentSettings) => void }) {
  const set = (field: keyof DocumentSettings, value: string | number) => onChange({ ...data, [field]: value });

  const estPreview = data.estimateYearFormat === 1
    ? `${data.estimatePrefix || 'EST'}-${new Date().getFullYear()}-0001`
    : `${data.estimatePrefix || 'EST'}-0001`;
  const invPreview = data.invoiceYearFormat === 1
    ? `${data.invoicePrefix || 'INV'}-${new Date().getFullYear()}-0001`
    : `${data.invoicePrefix || 'INV'}-0001`;

  return (
    <div className="space-y-8">
      {/* Number Formats */}
      <div>
        <SectionHeading>Document Number Formats</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Estimates</p>
            <div>
              <label className={labelCls}>Prefix</label>
              <input className={inputCls} value={data.estimatePrefix} onChange={e => set('estimatePrefix', e.target.value.toUpperCase())} placeholder="EST" maxLength={10} />
            </div>
            <div>
              <label className={labelCls}>Include Year</label>
              <select className={inputCls} value={data.estimateYearFormat} onChange={e => set('estimateYearFormat', Number(e.target.value))}>
                <option value={1}>Yes — EST-2026-0001</option>
                <option value={0}>No — EST-0001</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground pt-1">Preview: <span className="font-mono text-foreground font-semibold">{estPreview}</span></div>
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Invoices</p>
            <div>
              <label className={labelCls}>Prefix</label>
              <input className={inputCls} value={data.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value.toUpperCase())} placeholder="INV" maxLength={10} />
            </div>
            <div>
              <label className={labelCls}>Include Year</label>
              <select className={inputCls} value={data.invoiceYearFormat} onChange={e => set('invoiceYearFormat', Number(e.target.value))}>
                <option value={1}>Yes — INV-2026-0001</option>
                <option value={0}>No — INV-0001</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground pt-1">Preview: <span className="font-mono text-foreground font-semibold">{invPreview}</span></div>
          </div>
        </div>
      </div>

      {/* Header / Footer Text */}
      <div>
        <SectionHeading>Print Header & Footer Text</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Estimates</p>
            <div>
              <label className={labelCls}>Header text (printed above line items)</label>
              <input className={inputCls} value={data.estimateHeaderText} onChange={e => set('estimateHeaderText', e.target.value)} placeholder="e.g. Licensed & Insured · Lic #123456" />
            </div>
            <div>
              <label className={labelCls}>Footer text (printed at bottom)</label>
              <input className={inputCls} value={data.estimateFooterText} onChange={e => set('estimateFooterText', e.target.value)} placeholder="e.g. Thank you for choosing Dust to Done!" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Invoices</p>
            <div>
              <label className={labelCls}>Header text</label>
              <input className={inputCls} value={data.invoiceHeaderText} onChange={e => set('invoiceHeaderText', e.target.value)} placeholder="e.g. Licensed & Insured · Lic #123456" />
            </div>
            <div>
              <label className={labelCls}>Footer text</label>
              <input className={inputCls} value={data.invoiceFooterText} onChange={e => set('invoiceFooterText', e.target.value)} placeholder="e.g. Thank you for your business!" />
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div>
        <SectionHeading>Terms & Conditions</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Estimate terms</label>
            <textarea className={textareaCls} rows={5} value={data.estimateTerms} onChange={e => set('estimateTerms', e.target.value)} placeholder="Terms printed on estimates…" />
          </div>
          <div>
            <label className={labelCls}>Invoice terms / payment terms</label>
            <textarea className={textareaCls} rows={5} value={data.invoiceTerms} onChange={e => set('invoiceTerms', e.target.value)} placeholder="Payment terms printed on invoices…" />
          </div>
        </div>
      </div>

      {/* Signature Line */}
      <div>
        <SectionHeading>Estimate Signature Block</SectionHeading>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set('estimateSignatureLine', data.estimateSignatureLine === 1 ? 0 : 1)}
            className={`relative w-10 h-5 rounded-full transition-colors ${data.estimateSignatureLine === 1 ? 'bg-primary' : 'bg-muted border border-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.estimateSignatureLine === 1 ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-foreground">Include client signature & acceptance block on printed estimates</span>
        </label>
      </div>

      {/* Email Messages */}
      <div>
        <SectionHeading>Default Email Messages</SectionHeading>
        <p className="text-xs text-muted-foreground mb-4">These messages appear as the body text when you send estimates or invoices by email.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Estimate email message</label>
            <textarea className={textareaCls} rows={4} value={data.estimateEmailMessage} onChange={e => set('estimateEmailMessage', e.target.value)} placeholder="Message to include when emailing an estimate…" />
          </div>
          <div>
            <label className={labelCls}>Invoice email message</label>
            <textarea className={textareaCls} rows={4} value={data.invoiceEmailMessage} onChange={e => set('invoiceEmailMessage', e.target.value)} placeholder="Message to include when emailing an invoice…" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [company, setCompany] = useState<CompanySettings>({
    id: null, companyName: '', address: '', city: '', state: '', zip: '',
    phone: '', email: '', website: '', logoOnPrint: 1,
    defaultLaborRate: '65', defaultOverheadPct: '15', defaultProfitPct: '20',
  });
  const [docs, setDocs] = useState<DocumentSettings>({
    id: null, estimatePrefix: 'EST', estimateYearFormat: 1,
    invoicePrefix: 'INV', invoiceYearFormat: 1,
    estimateTerms: '', invoiceTerms: '',
    estimateHeaderText: '', estimateFooterText: '',
    invoiceHeaderText: '', invoiceFooterText: '',
    estimateSignatureLine: 1,
    estimateEmailMessage: '', invoiceEmailMessage: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        fetch('/api/settings/company'),
        fetch('/api/settings/documents'),
      ]);
      const [cData, dData] = await Promise.all([
        cRes.json() as Promise<CompanySettings>,
        dRes.json() as Promise<DocumentSettings>,
      ]);
      setCompany(cData);
      setDocs(dData);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch('/api/settings/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(company) }),
        fetch('/api/settings/documents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(docs) }),
      ]);
      if (!cRes.ok || !dRes.ok) throw new Error('Failed to save settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'documents', label: 'Documents & Templates', icon: FileSignature },
  ];

  return (
    <>
      <Helmet>
        <title>Settings – Dust to Done</title>
        <meta name="description" content="Configure company info, document templates, number formats, and print settings." />
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
                  <img src="/airo-assets/images/logo/horizontal" alt="Dust to Done" className="h-auto max-h-9 w-auto object-contain self-center flex-shrink-0" style={{ maxWidth: '36px' }} />
                  <span className="text-foreground font-semibold text-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>Dust to Done Renovation Solutions LLC</span>
                </div>
              : <img src="/airo-assets/images/logo/primary" alt="Dust to Done" className="w-8 h-8 object-contain self-center" />}
          </div>
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.map(({ icon: Icon, label, id, path }) => {
              const active = id === 'settings';
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Settings</h1>
              <p className="text-xs text-muted-foreground">Company info, document templates & print options</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </div>
              )}
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-muted/30 border border-border rounded-lg p-1 w-fit">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="bg-card border border-border rounded-xl p-6 max-w-4xl">
                {activeTab === 'company' && <CompanyTab data={company} onChange={setCompany} />}
                {activeTab === 'documents' && <DocumentsTab data={docs} onChange={setDocs} />}
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}
