import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router';
import { scope } from 'virtual:content';
import {
  Plus, Pencil, Trash2, Copy, FolderOpen, MapPin, User, DollarSign,
  ClipboardList, TrendingUp, CheckCircle2, Clock, FileText, XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScopeProject {
  id: number;
  projectName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobAddress: string | null;
  description: string | null;
  dimensions: string | null;
  specialInstructions: string | null;
  status: 'estimating' | 'proposal_sent' | 'approved' | 'in_progress' | 'completed' | 'declined';
  linkedJobId: number | null;
  linkedTakeoffId: number | null;
  sellingPrice: string | null;
  createdAt: string;
  costSummary: { sellingPrice: string; grossProfit: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: ScopeProject['status']): string {
  const map: Record<ScopeProject['status'], string> = {
    estimating: scope.statusEstimating,
    proposal_sent: scope.statusProposalSent,
    approved: scope.statusApproved,
    in_progress: scope.statusInProgress,
    completed: scope.statusCompleted,
    declined: scope.statusDeclined,
  };
  return map[s];
}

const STATUS_COLORS: Record<ScopeProject['status'], string> = {
  estimating: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  proposal_sent: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  in_progress: 'bg-primary/20 text-primary border-primary/30',
  completed: 'bg-muted text-muted-foreground border-border',
  declined: 'bg-destructive/20 text-destructive border-destructive/30',
};

const fmt = (n: string | null | undefined) =>
  n ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';

const EMPTY_FORM = {
  projectName: '', customerName: '', customerEmail: '', customerPhone: '',
  jobAddress: '', description: '', dimensions: '', specialInstructions: '',
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  form: typeof EMPTY_FORM;
  saving: boolean;
  onChange: (k: keyof typeof EMPTY_FORM, v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function ProjectModal({ title, form, saving, onChange, onSave, onClose }: ModalProps) {
  const inputCls = 'w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>{scope.fieldProjectName} *</label>
            <input className={inputCls} value={form.projectName} onChange={e => onChange('projectName', e.target.value)} placeholder="e.g. Johnson Bathroom Remodel" />
          </div>
          <div>
            <label className={labelCls}>{scope.fieldCustomerName} *</label>
            <input className={inputCls} value={form.customerName} onChange={e => onChange('customerName', e.target.value)} placeholder="Customer full name" />
          </div>
          <div>
            <label className={labelCls}>{scope.fieldCustomerPhone}</label>
            <input className={inputCls} value={form.customerPhone} onChange={e => onChange('customerPhone', e.target.value)} placeholder="(812) 555-0100" />
          </div>
          <div>
            <label className={labelCls}>{scope.fieldCustomerEmail}</label>
            <input className={inputCls} value={form.customerEmail} onChange={e => onChange('customerEmail', e.target.value)} placeholder="customer@email.com" />
          </div>
          <div>
            <label className={labelCls}>{scope.fieldJobAddress}</label>
            <input className={inputCls} value={form.jobAddress} onChange={e => onChange('jobAddress', e.target.value)} placeholder="123 Main St, Terre Haute IN" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{scope.fieldDescription}</label>
            <textarea className={inputCls + ' resize-none'} rows={3} value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Describe the renovation work requested…" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{scope.fieldDimensions}</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.dimensions} onChange={e => onChange('dimensions', e.target.value)} placeholder="e.g. 10ft x 12ft bathroom, 8ft ceiling height" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{scope.fieldSpecialInstructions}</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.specialInstructions} onChange={e => onChange('specialInstructions', e.target.value)} placeholder="Customer preferences, access restrictions, scheduling notes…" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">{scope.cancelButton}</button>
          <button
            onClick={onSave}
            disabled={saving || !form.projectName || !form.customerName}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : scope.saveButton}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScopePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ScopeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<ScopeProject | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/scope');
    const data = await res.json() as ScopeProject[];
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  // Stats
  const totalSales = projects.reduce((s, p) => s + Number(p.costSummary?.sellingPrice ?? p.sellingPrice ?? 0), 0);
  const totalProfit = projects.reduce((s, p) => s + Number(p.costSummary?.grossProfit ?? 0), 0);
  const counts = {
    total: projects.length,
    estimating: projects.filter(p => p.status === 'estimating').length,
    proposal_sent: projects.filter(p => p.status === 'proposal_sent').length,
    approved: projects.filter(p => p.status === 'approved').length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const openCreate = () => { setEditProject(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (p: ScopeProject) => {
    setEditProject(p);
    setForm({
      projectName: p.projectName, customerName: p.customerName,
      customerEmail: p.customerEmail ?? '', customerPhone: p.customerPhone ?? '',
      jobAddress: p.jobAddress ?? '', description: p.description ?? '',
      dimensions: p.dimensions ?? '', specialInstructions: p.specialInstructions ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editProject) {
      await fetch(`/api/scope/${editProject.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/scope', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setShowModal(false);
    void load();
  };

  const handleDelete = async (p: ScopeProject) => {
    if (!confirm(scope.deleteConfirm)) return;
    await fetch(`/api/scope/${p.id}`, { method: 'DELETE' });
    void load();
  };

  const handleDuplicate = async (p: ScopeProject) => {
    await fetch('/api/scope', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: `${p.projectName} (Copy)`, customerName: p.customerName,
        customerEmail: p.customerEmail, customerPhone: p.customerPhone,
        jobAddress: p.jobAddress, description: p.description,
        dimensions: p.dimensions, specialInstructions: p.specialInstructions,
      }),
    });
    void load();
  };

  const setF = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const statCards = [
    { label: scope.statTotal, value: String(counts.total), icon: ClipboardList, color: 'text-primary' },
    { label: scope.statEstimating, value: String(counts.estimating), icon: Clock, color: 'text-blue-400' },
    { label: scope.statProposalSent, value: String(counts.proposal_sent), icon: FileText, color: 'text-yellow-400' },
    { label: scope.statApproved, value: String(counts.approved), icon: CheckCircle2, color: 'text-green-400' },
    { label: scope.statInProgress, value: String(counts.in_progress), icon: TrendingUp, color: 'text-primary' },
    { label: scope.statCompleted, value: String(counts.completed), icon: CheckCircle2, color: 'text-muted-foreground' },
    { label: scope.statTotalSales, value: fmt(String(totalSales)), icon: DollarSign, color: 'text-primary' },
    { label: scope.statGrossProfit, value: fmt(String(totalProfit)), icon: TrendingUp, color: 'text-green-400' },
  ];

  return (
    <>
      <Helmet>
        <title>AI Scope Builder — Dust to Done</title>
        <meta name="description" content="AI-powered project scope builder and estimator for Dust to Done Renovation Solutions." />
      </Helmet>
      <main className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">{scope.pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{scope.pageDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              {scope.newProjectButton}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-base font-semibold text-foreground mb-1">{scope.noProjectsTitle}</p>
            <p className="text-sm text-muted-foreground mb-4">{scope.noProjectsText}</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              {scope.newProjectButton}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => {
              const sp = p.costSummary?.sellingPrice ?? p.sellingPrice;
              const gp = p.costSummary?.grossProfit;
              return (
                <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{p.projectName}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{p.customerName}</span>
                      </div>
                      {p.jobAddress && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{p.jobAddress}</span>
                        </div>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs border rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[p.status]}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  {(sp || gp) && (
                    <div className="flex items-center gap-4 pt-1 border-t border-border">
                      {sp && (
                        <div>
                          <p className="text-xs text-muted-foreground">Selling Price</p>
                          <p className="text-sm font-bold text-primary">{fmt(sp)}</p>
                        </div>
                      )}
                      {gp && Number(gp) > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Profit</p>
                          <p className="text-sm font-bold text-green-400">{fmt(gp)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/scope/${p.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {scope.openButton}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void handleDuplicate(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void handleDelete(p)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showModal && (
        <ProjectModal
          title={editProject ? scope.modalEditTitle : scope.modalCreateTitle}
          form={form}
          saving={saving}
          onChange={setF}
          onSave={() => void handleSave()}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
