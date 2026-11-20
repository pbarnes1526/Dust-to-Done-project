import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useParams, useNavigate } from 'react-router';
import { scope_detail } from 'virtual:content';
import {
  ArrowLeft, Upload, Sparkles, Plus, Trash2, Pencil, Check, X, Loader2,
  AlertTriangle, AlertCircle, ExternalLink, Flag, Lock, Camera,
  Printer, FileText, CheckCircle2,
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
  status: string;
  linkedTakeoffId: number | null;
  proposalPaymentSchedule: string | null;
  proposalDuration: string | null;
  proposalWarranty: string | null;
  proposalExclusions: string | null;
  proposalNotes: string | null;
  sellingPrice: string | null;
}

interface ScopePhoto {
  id: number;
  projectId: number;
  filename: string;
  url: string;
  originalName: string | null;
}

interface ScopeTask {
  id: number;
  projectId: number;
  phase: 'preparation' | 'demolition' | 'installation' | 'finishing';
  description: string;
  sortOrder: number;
  flagged: number;
  flagNote: string | null;
  aiGenerated: number;
}

interface ScopeLabor {
  id: number;
  projectId: number;
  taskId: number | null;
  description: string;
  hours: string;
  workers: number;
  crewDays: string;
  rate: string;
  extended: string;
  assumptions: string | null;
  requiresInspection: number;
  aiGenerated: number;
  sortOrder: number;
}

interface CostSummary {
  id: number;
  projectId: number;
  materialCost: string;
  wasteAllowance: string;
  laborCost: string;
  subcontractorCost: string;
  equipmentRental: string;
  deliveryCharges: string;
  disposalCost: string;
  permitAllowance: string;
  miscExpenses: string;
  totalDirectCost: string;
  overheadPct: string;
  overhead: string;
  profitPct: string;
  profitMargin: string;
  sellingPrice: string;
  grossProfit: string;
  grossProfitPct: string;
}

interface ChangeOrder {
  id: number;
  projectId: number;
  title: string;
  scopeDescription: string | null;
  additionalMaterials: string | null;
  additionalLabor: string | null;
  priceAdjustment: string;
  scheduleAdjustment: string | null;
  status: 'draft' | 'sent' | 'approved' | 'declined';
  approvedAt: string | null;
  createdAt: string;
}

interface AIResult {
  tasks: { phase: string; description: string; flagged: boolean; flagNote: string }[];
  labor: { description: string; hours: number; workers: number; crewDays: number; rate: number; extended: number; assumptions: string; requiresInspection: boolean }[];
  analysisNotes: string;
  photoSummary: string;
  photoCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: ScopeTask['phase'][] = ['preparation', 'demolition', 'installation', 'finishing'];

function phaseLabel(ph: ScopeTask['phase']): string {
  const map: Record<ScopeTask['phase'], string> = {
    preparation: scope_detail.phasePreparation,
    demolition: scope_detail.phaseDemolition,
    installation: scope_detail.phaseInstallation,
    finishing: scope_detail.phaseFinishing,
  };
  return map[ph];
}

const PHASE_COLORS: Record<ScopeTask['phase'], string> = {
  preparation: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  demolition: 'bg-red-500/10 border-red-500/30 text-red-300',
  installation: 'bg-primary/10 border-primary/30 text-primary',
  finishing: 'bg-green-500/10 border-green-500/30 text-green-300',
};

const CO_STATUS_COLORS: Record<ChangeOrder['status'], string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  declined: 'bg-destructive/20 text-destructive border-destructive/30',
};

const fmt = (n: string | number | null | undefined) =>
  n !== null && n !== undefined ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';

const inputCls = 'w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: ScopeTask;
  onUpdate: (id: number, data: Partial<Pick<ScopeTask, 'phase' | 'description' | 'flagged' | 'flagNote'>>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function TaskRow({ task, onUpdate, onDelete }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phase: task.phase, description: task.description, flagged: task.flagged, flagNote: task.flagNote ?? '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(task.id, form);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-muted/30 border border-primary/30 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Phase</label>
            <select className={inputCls} value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value as ScopeTask['phase'] }))}>
              {PHASES.map(ph => <option key={ph} value={ph}>{phaseLabel(ph)}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Task Description</label>
            <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.flagged === 1} onChange={e => setForm(f => ({ ...f, flagged: e.target.checked ? 1 : 0 }))} className="rounded" />
            Flag (permit / licensed trade required)
          </label>
          {form.flagged === 1 && (
            <input className={inputCls + ' flex-1'} value={form.flagNote} onChange={e => setForm(f => ({ ...f, flagNote: e.target.value }))} placeholder="Flag note…" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void handleSave()} disabled={saving || !form.description} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:text-foreground">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-muted/20 group">
      <span className={`flex-shrink-0 text-xs border rounded px-1.5 py-0.5 font-medium mt-0.5 ${PHASE_COLORS[task.phase]}`}>
        {phaseLabel(task.phase)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{task.description}</p>
        {task.flagged === 1 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Flag className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">{task.flagNote || scope_detail.flaggedBadge}</span>
          </div>
        )}
      </div>
      {task.aiGenerated === 1 && (
        <span className="flex-shrink-0 text-xs bg-primary/20 text-primary border border-primary/30 rounded px-1 py-0.5 font-semibold">{scope_detail.aiGeneratedBadge}</span>
      )}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground rounded"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => void onDelete(task.id)} className="p-1 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Labor Row ────────────────────────────────────────────────────────────────

interface LaborRowProps {
  row: ScopeLabor;
  onUpdate: (id: number, data: Partial<Pick<ScopeLabor, 'description' | 'hours' | 'workers' | 'crewDays' | 'rate' | 'assumptions' | 'requiresInspection'>>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function LaborRow({ row, onUpdate, onDelete }: LaborRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: row.description, hours: row.hours, workers: String(row.workers),
    crewDays: row.crewDays, rate: row.rate, assumptions: row.assumptions ?? '',
    requiresInspection: row.requiresInspection,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(row.id, { ...form, workers: Number(form.workers), requiresInspection: form.requiresInspection });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-muted/30 border border-primary/30 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-4">
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Hours</label>
            <input className={inputCls} type="number" min="0" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Workers</label>
            <input className={inputCls} type="number" min="1" value={form.workers} onChange={e => setForm(f => ({ ...f, workers: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Crew Days</label>
            <input className={inputCls} type="number" min="0" step="0.5" value={form.crewDays} onChange={e => setForm(f => ({ ...f, crewDays: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Rate ($/hr)</label>
            <input className={inputCls} type="number" min="0" step="5" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
          </div>
          <div className="sm:col-span-4">
            <label className={labelCls}>Assumptions / Notes</label>
            <input className={inputCls} value={form.assumptions} onChange={e => setForm(f => ({ ...f, assumptions: e.target.value }))} placeholder="Key assumptions…" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.requiresInspection === 1} onChange={e => setForm(f => ({ ...f, requiresInspection: e.target.checked ? 1 : 0 }))} className="rounded" />
            Requires inspection / permit
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void handleSave()} disabled={saving || !form.description} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:text-foreground">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  const extended = Number(form.hours) * Number(form.workers) * Number(form.rate);

  return (
    <div className="grid grid-cols-12 gap-2 py-2 px-3 rounded-lg hover:bg-muted/20 group items-center text-sm">
      <div className="col-span-12 sm:col-span-5">
        <p className="text-foreground text-sm">{row.description}</p>
        {row.assumptions && <p className="text-xs text-muted-foreground italic mt-0.5">{row.assumptions}</p>}
        {row.requiresInspection === 1 && (
          <div className="flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">Requires inspection</span>
          </div>
        )}
      </div>
      <div className="col-span-3 sm:col-span-1 text-center">
        <p className="text-xs text-muted-foreground">Hrs</p>
        <p className="text-sm font-medium text-foreground">{row.hours}</p>
      </div>
      <div className="col-span-3 sm:col-span-1 text-center">
        <p className="text-xs text-muted-foreground">Workers</p>
        <p className="text-sm font-medium text-foreground">{row.workers}</p>
      </div>
      <div className="col-span-3 sm:col-span-1 text-center">
        <p className="text-xs text-muted-foreground">Days</p>
        <p className="text-sm font-medium text-foreground">{row.crewDays}</p>
      </div>
      <div className="col-span-3 sm:col-span-2 text-right">
        <p className="text-xs text-muted-foreground">{fmt(row.rate)}/hr</p>
        <p className="text-sm font-bold text-primary">{fmt(extended)}</p>
      </div>
      {row.aiGenerated === 1 && (
        <span className="col-span-1 text-xs bg-primary/20 text-primary border border-primary/30 rounded px-1 py-0.5 font-semibold text-center">{scope_detail.aiGeneratedBadge}</span>
      )}
      <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
        <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground rounded"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => void onDelete(row.id)} className="p-1 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScopeDetailPage() {
  const { scopeId } = useParams<{ scopeId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ScopeProject | null>(null);
  const [photos, setPhotos] = useState<ScopePhoto[]>([]);
  const [tasks, setTasks] = useState<ScopeTask[]>([]);
  const [labor, setLabor] = useState<ScopeLabor[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scope' | 'labor' | 'costs' | 'changeorders' | 'proposal'>('scope');

  // AI
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState('');

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Add task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({ phase: 'installation' as ScopeTask['phase'], description: '', flagged: 0, flagNote: '' });
  const [addTaskSaving, setAddTaskSaving] = useState(false);

  // Add labor form
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [addLaborForm, setAddLaborForm] = useState({ description: '', hours: '8', workers: '2', crewDays: '0.5', rate: '65', assumptions: '', requiresInspection: 0 });
  const [addLaborSaving, setAddLaborSaving] = useState(false);

  // Cost summary form
  const [costForm, setCostForm] = useState({
    materialCost: '0', wasteAllowance: '0', laborCost: '0', subcontractorCost: '0',
    equipmentRental: '0', deliveryCharges: '0', disposalCost: '0', permitAllowance: '0',
    miscExpenses: '0', overheadPct: '15', profitPct: '20',
  });
  const [costSaving, setCostSaving] = useState(false);

  // Change order form
  const [showAddCO, setShowAddCO] = useState(false);
  const [coForm, setCoForm] = useState({ title: '', scopeDescription: '', additionalMaterials: '', additionalLabor: '', priceAdjustment: '0', scheduleAdjustment: '' });
  const [coSaving, setCoSaving] = useState(false);

  // Project info edit
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ projectName: '', customerName: '', customerEmail: '', customerPhone: '', jobAddress: '', description: '', dimensions: '', specialInstructions: '' });
  const [infoSaving, setInfoSaving] = useState(false);

  // Send to takeoff
  const [sendingToTakeoff, setSendingToTakeoff] = useState(false);

  const load = useCallback(async () => {
    if (!scopeId) return;
    setLoading(true);
    const res = await fetch(`/api/scope/${scopeId}`);
    if (!res.ok) { navigate('/scope'); return; }
    const data = await res.json() as { project: ScopeProject; photos: ScopePhoto[]; tasks: ScopeTask[]; labor: ScopeLabor[]; costSummary: CostSummary | null; changeOrders: ChangeOrder[] };
    setProject(data.project);
    setPhotos(Array.isArray(data.photos) ? data.photos : []);
    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    setLabor(Array.isArray(data.labor) ? data.labor : []);
    setChangeOrders(Array.isArray(data.changeOrders) ? data.changeOrders : []);
    if (data.costSummary) {
      setCostSummary(data.costSummary);
      setCostForm({
        materialCost: data.costSummary.materialCost,
        wasteAllowance: data.costSummary.wasteAllowance,
        laborCost: data.costSummary.laborCost,
        subcontractorCost: data.costSummary.subcontractorCost,
        equipmentRental: data.costSummary.equipmentRental,
        deliveryCharges: data.costSummary.deliveryCharges,
        disposalCost: data.costSummary.disposalCost,
        permitAllowance: data.costSummary.permitAllowance,
        miscExpenses: data.costSummary.miscExpenses,
        overheadPct: data.costSummary.overheadPct,
        profitPct: data.costSummary.profitPct,
      });
    }
    setInfoForm({
      projectName: data.project.projectName, customerName: data.project.customerName,
      customerEmail: data.project.customerEmail ?? '', customerPhone: data.project.customerPhone ?? '',
      jobAddress: data.project.jobAddress ?? '', description: data.project.description ?? '',
      dimensions: data.project.dimensions ?? '', specialInstructions: data.project.specialInstructions ?? '',
    });
    setLoading(false);
  }, [scopeId, navigate]);

  useEffect(() => { void load(); }, [load]);

  // ── Photo upload ────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !scopeId) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    const res = await fetch(`/api/scope/${scopeId}/photos`, { method: 'POST', body: fd });
    const updated = await res.json();
    if (Array.isArray(updated)) setPhotos(updated);
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!scopeId) return;
    await fetch(`/api/scope/${scopeId}/photos/${photoId}`, { method: 'DELETE' });
    setPhotos(p => p.filter(x => x.id !== photoId));
  };

  // ── AI Analyze ──────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!scopeId) return;
    setAnalyzing(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await fetch(`/api/scope/${scopeId}/analyze`, { method: 'POST' });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Analysis failed' })) as { error: string; message?: string };
        setAiError(err.message ?? err.error);
        setAnalyzing(false);
        return;
      }
      // Consume SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); }
          else if (line.startsWith('data: ')) {
            const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (eventType === 'result') { setAiResult(payload as unknown as AIResult); }
            else if (eventType === 'error') { setAiError((payload.message ?? payload.error) as string); }
          }
        }
      }
    } catch (e) {
      setAiError(String(e));
    }
    setAnalyzing(false);
  };

  const handleApplyAI = async () => {
    if (!aiResult || !scopeId) return;
    // Save tasks
    await fetch(`/api/scope/${scopeId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replace: true,
        items: aiResult.tasks.map((t, i) => ({
          phase: t.phase, description: t.description,
          flagged: t.flagged ? 1 : 0, flagNote: t.flagNote ?? '',
          aiGenerated: 1, sortOrder: i,
        })),
      }),
    });
    // Save labor
    await fetch(`/api/scope/${scopeId}/labor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replace: true,
        items: aiResult.labor.map((l, i) => ({
          description: l.description, hours: String(l.hours), workers: l.workers,
          crewDays: String(l.crewDays), rate: String(l.rate),
          assumptions: l.assumptions, requiresInspection: l.requiresInspection ? 1 : 0,
          aiGenerated: 1, sortOrder: i,
        })),
      }),
    });
    // Auto-populate labor cost in cost summary
    const totalLabor = aiResult.labor.reduce((s, l) => s + l.extended, 0);
    await fetch(`/api/scope/${scopeId}/cost-summary`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...costForm, laborCost: String(Math.round(totalLabor * 100) / 100) }),
    });
    setAiResult(null);
    void load();
  };

  // ── Tasks CRUD ──────────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!scopeId || !addTaskForm.description) return;
    setAddTaskSaving(true);
    await fetch(`/api/scope/${scopeId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ ...addTaskForm, sortOrder: tasks.length }] }),
    });
    setAddTaskForm({ phase: 'installation', description: '', flagged: 0, flagNote: '' });
    setShowAddTask(false);
    setAddTaskSaving(false);
    void load();
  };

  const handleUpdateTask = async (id: number, data: Partial<Pick<ScopeTask, 'phase' | 'description' | 'flagged' | 'flagNote'>>) => {
    if (!scopeId) return;
    await fetch(`/api/scope/${scopeId}/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    void load();
  };

  const handleDeleteTask = async (id: number) => {
    if (!scopeId || !confirm(scope_detail.deleteConfirmTask)) return;
    await fetch(`/api/scope/${scopeId}/tasks/${id}`, { method: 'DELETE' });
    setTasks(t => t.filter(x => x.id !== id));
  };

  // ── Labor CRUD ──────────────────────────────────────────────────────────────

  const handleAddLabor = async () => {
    if (!scopeId || !addLaborForm.description) return;
    setAddLaborSaving(true);
    await fetch(`/api/scope/${scopeId}/labor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ ...addLaborForm, sortOrder: labor.length }] }),
    });
    setAddLaborForm({ description: '', hours: '8', workers: '2', crewDays: '0.5', rate: '65', assumptions: '', requiresInspection: 0 });
    setShowAddLabor(false);
    setAddLaborSaving(false);
    void load();
  };

  const handleUpdateLabor = async (id: number, data: Partial<Pick<ScopeLabor, 'description' | 'hours' | 'workers' | 'crewDays' | 'rate' | 'assumptions' | 'requiresInspection'>>) => {
    if (!scopeId) return;
    await fetch(`/api/scope/${scopeId}/labor/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    void load();
  };

  const handleDeleteLabor = async (id: number) => {
    if (!scopeId || !confirm(scope_detail.deleteConfirmLabor)) return;
    await fetch(`/api/scope/${scopeId}/labor/${id}`, { method: 'DELETE' });
    setLabor(l => l.filter(x => x.id !== id));
  };

  // ── Cost Summary ────────────────────────────────────────────────────────────

  const handleSaveCosts = async () => {
    if (!scopeId) return;
    setCostSaving(true);
    const res = await fetch(`/api/scope/${scopeId}/cost-summary`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(costForm) });
    const updated = await res.json() as CostSummary;
    setCostSummary(updated);
    setCostSaving(false);
  };

  // ── Change Orders ───────────────────────────────────────────────────────────

  const handleAddCO = async () => {
    if (!scopeId || !coForm.title) return;
    setCoSaving(true);
    await fetch(`/api/scope/${scopeId}/change-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coForm) });
    setCoForm({ title: '', scopeDescription: '', additionalMaterials: '', additionalLabor: '', priceAdjustment: '0', scheduleAdjustment: '' });
    setShowAddCO(false);
    setCoSaving(false);
    void load();
  };

  const handleUpdateCOStatus = async (co: ChangeOrder, status: ChangeOrder['status']) => {
    if (!scopeId) return;
    await fetch(`/api/scope/${scopeId}/change-orders/${co.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    void load();
  };

  const handleDeleteCO = async (id: number) => {
    if (!scopeId || !confirm(scope_detail.deleteConfirmCO)) return;
    await fetch(`/api/scope/${scopeId}/change-orders/${id}`, { method: 'DELETE' });
    setChangeOrders(c => c.filter(x => x.id !== id));
  };

  // ── Project Info ────────────────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    if (!scopeId) return;
    setInfoSaving(true);
    await fetch(`/api/scope/${scopeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(infoForm) });
    setInfoSaving(false);
    setEditingInfo(false);
    void load();
  };

  // ── Send to Takeoff ─────────────────────────────────────────────────────────

  const handleSendToTakeoff = async () => {
    if (!scopeId) return;
    setSendingToTakeoff(true);
    const res = await fetch(`/api/scope/${scopeId}/send-to-takeoff`, { method: 'POST' });
    const data = await res.json() as { takeoffId: number; alreadyLinked: boolean };
    setSendingToTakeoff(false);
    navigate(`/takeoff/${data.takeoffId}`);
  };

  // ── Computed ────────────────────────────────────────────────────────────────

  const totalLaborCost = labor.reduce((s, l) => s + Number(l.extended), 0);
  const tasksByPhase = PHASES.map(ph => ({ phase: ph, tasks: tasks.filter(t => t.phase === ph) }));

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!project) return null;

  const tabs = [
    { id: 'scope' as const, label: scope_detail.tabScope, count: tasks.length },
    { id: 'labor' as const, label: scope_detail.tabLabor, count: labor.length },
    { id: 'costs' as const, label: scope_detail.tabCosts },
    { id: 'changeorders' as const, label: scope_detail.tabChangeOrders, count: changeOrders.length },
    { id: 'proposal' as const, label: scope_detail.tabProposal },
  ];

  return (
    <>
      <Helmet>
        <title>{project.projectName} — Scope Builder — Dust to Done</title>
        <meta name="description" content={`AI scope of work and proposal for ${project.projectName}`} />
      </Helmet>
      <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/scope')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {scope_detail.backButton}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* ── Left panel ─────────────────────────────────────────────────── */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Project info */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">{project.projectName}</h2>
                <button onClick={() => setEditingInfo(!editingInfo)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {editingInfo ? (
                <div className="space-y-2">
                  {(['projectName', 'customerName', 'customerEmail', 'customerPhone', 'jobAddress'] as const).map(k => (
                    <div key={k}>
                      <label className={labelCls}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <input className={inputCls} value={infoForm[k]} onChange={e => setInfoForm(f => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea className={inputCls + ' resize-none'} rows={3} value={infoForm.description} onChange={e => setInfoForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Dimensions</label>
                    <textarea className={inputCls + ' resize-none'} rows={2} value={infoForm.dimensions} onChange={e => setInfoForm(f => ({ ...f, dimensions: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Special Instructions</label>
                    <textarea className={inputCls + ' resize-none'} rows={2} value={infoForm.specialInstructions} onChange={e => setInfoForm(f => ({ ...f, specialInstructions: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => void handleSaveInfo()} disabled={infoSaving} className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      {infoSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingInfo(false)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="text-foreground font-medium">Customer:</span> {project.customerName}</p>
                  {project.customerEmail && <p><span className="text-foreground font-medium">Email:</span> {project.customerEmail}</p>}
                  {project.customerPhone && <p><span className="text-foreground font-medium">Phone:</span> {project.customerPhone}</p>}
                  {project.jobAddress && <p><span className="text-foreground font-medium">Address:</span> {project.jobAddress}</p>}
                  {project.dimensions && <p><span className="text-foreground font-medium">Dimensions:</span> {project.dimensions}</p>}
                  {project.description && <p className="mt-2 text-foreground/80 leading-relaxed">{project.description}</p>}
                  {project.specialInstructions && <p className="mt-1 italic">{project.specialInstructions}</p>}
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  {scope_detail.photoSectionTitle}
                  <span className="text-xs text-muted-foreground">({photos.length})</span>
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {scope_detail.uploadPhotosButton}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void handlePhotoUpload(e.target.files)} />
              </div>
              {photos.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors"
                >
                  <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Upload project photos</p>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.map(ph => (
                    <div key={ph.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={ph.url} alt={ph.originalName ?? 'Photo'} className="w-full h-full object-cover" />
                      <button
                        onClick={() => void handleDeletePhoto(ph.id)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI + Takeoff actions */}
            <div className="space-y-2">
              <button
                onClick={() => void handleAnalyze()}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analyzing ? scope_detail.aiAnalyzing : scope_detail.aiAnalyzeButton}
              </button>
              {project.linkedTakeoffId ? (
                <button
                  onClick={() => navigate(`/takeoff/${project.linkedTakeoffId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {scope_detail.viewTakeoffButton}
                </button>
              ) : (
                <button
                  onClick={() => void handleSendToTakeoff()}
                  disabled={sendingToTakeoff}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-60"
                >
                  {sendingToTakeoff ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {scope_detail.sendToTakeoffButton}
                </button>
              )}
            </div>
          </div>

          {/* ── Right panel ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* AI Result panel */}
            {aiError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Analysis failed</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{aiError}</p>
                </div>
                <button onClick={() => setAiError('')} className="ml-auto text-destructive/60 hover:text-destructive"><X className="w-4 h-4" /></button>
              </div>
            )}

            {aiResult && (
              <div className="bg-card border border-primary/40 rounded-xl p-5 mb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Analysis Results
                    <span className="text-xs text-muted-foreground font-normal">({aiResult.tasks.length} tasks, {aiResult.labor.length} labor rows)</span>
                  </h3>
                  <button onClick={() => setAiResult(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>

                {aiResult.photoSummary && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Photo Summary</p>
                    <p className="text-xs text-foreground">{aiResult.photoSummary}</p>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">
                    <span className="font-semibold">{scope_detail.analysisPriceDisclaimer}</span> Review all tasks and labor estimates before presenting to the customer.
                  </p>
                </div>

                {aiResult.analysisNotes && (
                  <p className="text-xs text-muted-foreground italic">{aiResult.analysisNotes}</p>
                )}

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {aiResult.tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs py-1">
                      <span className={`flex-shrink-0 border rounded px-1.5 py-0.5 font-medium ${PHASE_COLORS[t.phase as ScopeTask['phase']] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {phaseLabel(t.phase as ScopeTask['phase'])}
                      </span>
                      <span className="text-foreground">{t.description}</span>
                      {t.flagged && <Flag className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <button
                    onClick={() => void handleApplyAI()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Apply to Scope & Labor
                  </button>
                  <button onClick={() => setAiResult(null)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:text-foreground transition-colors">
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border mb-4 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Scope of Work tab ─────────────────────────────────────── */}
            {activeTab === 'scope' && (
              <div className="space-y-4">
                {tasksByPhase.map(({ phase, tasks: phaseTasks }) => (
                  <div key={phase} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border ${PHASE_COLORS[phase].replace('border-', 'border-b-').split(' ')[0]}`}>
                      <h3 className={`text-xs font-bold uppercase tracking-wide ${PHASE_COLORS[phase].split(' ')[2]}`}>
                        {phaseLabel(phase)}
                        <span className="ml-2 font-normal text-muted-foreground">({phaseTasks.length})</span>
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {phaseTasks.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground italic">No tasks in this phase.</p>
                      ) : (
                        phaseTasks.map(t => (
                          <TaskRow key={t.id} task={t} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                        ))
                      )}
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && !aiResult && (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{scope_detail.noTasksText}</p>
                  </div>
                )}

                {/* Add task form */}
                {showAddTask ? (
                  <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Add Task</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>Phase</label>
                        <select className={inputCls} value={addTaskForm.phase} onChange={e => setAddTaskForm(f => ({ ...f, phase: e.target.value as ScopeTask['phase'] }))}>
                          {PHASES.map(ph => <option key={ph} value={ph}>{phaseLabel(ph)}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Task Description</label>
                        <input className={inputCls} value={addTaskForm.description} onChange={e => setAddTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task…" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={addTaskForm.flagged === 1} onChange={e => setAddTaskForm(f => ({ ...f, flagged: e.target.checked ? 1 : 0 }))} className="rounded" />
                        Flag (permit / licensed trade)
                      </label>
                      {addTaskForm.flagged === 1 && (
                        <input className={inputCls + ' flex-1'} value={addTaskForm.flagNote} onChange={e => setAddTaskForm(f => ({ ...f, flagNote: e.target.value }))} placeholder="Flag note…" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void handleAddTask()} disabled={addTaskSaving || !addTaskForm.description} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {addTaskSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Task
                      </button>
                      <button onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddTask(true)} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
                    <Plus className="w-4 h-4" />
                    {scope_detail.addTaskButton}
                  </button>
                )}
              </div>
            )}

            {/* ── Labor Estimate tab ────────────────────────────────────── */}
            {activeTab === 'labor' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Header row */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-1 text-center">Hrs</div>
                    <div className="col-span-1 text-center">Workers</div>
                    <div className="col-span-1 text-center">Days</div>
                    <div className="col-span-2 text-right">Rate / Extended</div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {labor.length === 0 ? (
                      <p className="px-4 py-8 text-sm text-muted-foreground text-center">{scope_detail.noLaborText}</p>
                    ) : (
                      labor.map(l => <LaborRow key={l.id} row={l} onUpdate={handleUpdateLabor} onDelete={handleDeleteLabor} />)
                    )}
                  </div>
                  {labor.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                      <span className="text-sm font-semibold text-foreground">{scope_detail.laborTotalLabel}</span>
                      <span className="text-lg font-bold text-primary">{fmt(totalLaborCost)}</span>
                    </div>
                  )}
                </div>

                {/* Add labor form */}
                {showAddLabor ? (
                  <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Add Labor Row</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2 sm:col-span-4">
                        <label className={labelCls}>Description</label>
                        <input className={inputCls} value={addLaborForm.description} onChange={e => setAddLaborForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Demo existing tile floor" />
                      </div>
                      <div>
                        <label className={labelCls}>Hours</label>
                        <input className={inputCls} type="number" min="0" step="0.5" value={addLaborForm.hours} onChange={e => setAddLaborForm(f => ({ ...f, hours: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Workers</label>
                        <input className={inputCls} type="number" min="1" value={addLaborForm.workers} onChange={e => setAddLaborForm(f => ({ ...f, workers: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Crew Days</label>
                        <input className={inputCls} type="number" min="0" step="0.5" value={addLaborForm.crewDays} onChange={e => setAddLaborForm(f => ({ ...f, crewDays: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Rate ($/hr)</label>
                        <input className={inputCls} type="number" min="0" step="5" value={addLaborForm.rate} onChange={e => setAddLaborForm(f => ({ ...f, rate: e.target.value }))} />
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <label className={labelCls}>Assumptions / Notes</label>
                        <input className={inputCls} value={addLaborForm.assumptions} onChange={e => setAddLaborForm(f => ({ ...f, assumptions: e.target.value }))} placeholder="Key assumptions…" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void handleAddLabor()} disabled={addLaborSaving || !addLaborForm.description} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {addLaborSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Row
                      </button>
                      <button onClick={() => setShowAddLabor(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddLabor(true)} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
                    <Plus className="w-4 h-4" />
                    {scope_detail.addLaborButton}
                  </button>
                )}
              </div>
            )}

            {/* ── Cost Summary tab ──────────────────────────────────────── */}
            {activeTab === 'costs' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                  <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-xs text-yellow-300 font-semibold">{scope_detail.internalOnlyWarning}</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Direct Costs</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      ['materialCost', 'Material Cost'],
                      ['wasteAllowance', 'Waste Allowance'],
                      ['laborCost', 'Labor Cost'],
                      ['subcontractorCost', 'Subcontractor Cost'],
                      ['equipmentRental', 'Equipment Rental'],
                      ['deliveryCharges', 'Delivery Charges'],
                      ['disposalCost', 'Disposal / Haul-off'],
                      ['permitAllowance', 'Permit Allowance'],
                      ['miscExpenses', 'Miscellaneous'],
                    ] as [keyof typeof costForm, string][]).map(([k, label]) => (
                      <div key={k}>
                        <label className={labelCls}>{label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input
                            className={inputCls + ' pl-7'}
                            type="number" min="0" step="0.01"
                            value={costForm[k]}
                            onChange={e => setCostForm(f => ({ ...f, [k]: e.target.value }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Overhead %</label>
                      <div className="relative">
                        <input className={inputCls + ' pr-7'} type="number" min="0" max="100" step="0.5" value={costForm.overheadPct} onChange={e => setCostForm(f => ({ ...f, overheadPct: e.target.value }))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Profit Margin %</label>
                      <div className="relative">
                        <input className={inputCls + ' pr-7'} type="number" min="0" max="100" step="0.5" value={costForm.profitPct} onChange={e => setCostForm(f => ({ ...f, profitPct: e.target.value }))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => void handleSaveCosts()} disabled={costSaving} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                    {costSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {scope_detail.costSummarySaveButton}
                  </button>
                </div>

                {costSummary && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Calculated Totals</h3>
                    <div className="space-y-2">
                      {[
                        ['Total Direct Cost', costSummary.totalDirectCost, 'text-foreground'],
                        [`Overhead (${costSummary.overheadPct}%)`, costSummary.overhead, 'text-muted-foreground'],
                        [`Profit Margin (${costSummary.profitPct}%)`, costSummary.profitMargin, 'text-muted-foreground'],
                        [scope_detail.costSellingPriceLabel, costSummary.sellingPrice, 'text-primary font-bold text-base'],
                        [scope_detail.costGrossProfitLabel, `${fmt(costSummary.grossProfit)} (${Number(costSummary.grossProfitPct).toFixed(1)}%)`, 'text-green-400 font-semibold'],
                      ].map(([label, value, cls]) => (
                        <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className={`text-sm ${cls}`}>{typeof value === 'string' && value.startsWith('$') ? value : fmt(String(value))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Change Orders tab ─────────────────────────────────────── */}
            {activeTab === 'changeorders' && (
              <div className="space-y-4">
                {changeOrders.length === 0 && !showAddCO && (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{scope_detail.noChangeOrdersText}</p>
                  </div>
                )}

                {changeOrders.map(co => (
                  <div key={co.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{co.title}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(co.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${CO_STATUS_COLORS[co.status]}`}>
                          {co.status.charAt(0).toUpperCase() + co.status.slice(1)}
                        </span>
                        <button onClick={() => void handleDeleteCO(co.id)} className="p-1 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {co.scopeDescription && <p className="text-xs text-muted-foreground mb-2">{co.scopeDescription}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">+{fmt(co.priceAdjustment)}</span>
                      {co.status === 'draft' && (
                        <div className="flex gap-2">
                          <button onClick={() => void handleUpdateCOStatus(co, 'sent')} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-xs font-medium hover:bg-yellow-500/30">Mark Sent</button>
                          <button onClick={() => void handleUpdateCOStatus(co, 'approved')} className="px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg text-xs font-medium hover:bg-green-500/30">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {showAddCO ? (
                  <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">New Change Order</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Title *</label>
                        <input className={inputCls} value={coForm.title} onChange={e => setCoForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Add heated floor in bathroom" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Scope Description</label>
                        <textarea className={inputCls + ' resize-none'} rows={3} value={coForm.scopeDescription} onChange={e => setCoForm(f => ({ ...f, scopeDescription: e.target.value }))} placeholder="Describe the additional work…" />
                      </div>
                      <div>
                        <label className={labelCls}>Price Adjustment ($)</label>
                        <input className={inputCls} type="number" min="0" step="0.01" value={coForm.priceAdjustment} onChange={e => setCoForm(f => ({ ...f, priceAdjustment: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Schedule Adjustment</label>
                        <input className={inputCls} value={coForm.scheduleAdjustment} onChange={e => setCoForm(f => ({ ...f, scheduleAdjustment: e.target.value }))} placeholder="e.g. +2 days" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void handleAddCO()} disabled={coSaving || !coForm.title} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {coSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Change Order
                      </button>
                      <button onClick={() => setShowAddCO(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddCO(true)} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
                    <Plus className="w-4 h-4" />
                    {scope_detail.addChangeOrderButton}
                  </button>
                )}
              </div>
            )}

            {/* ── Proposal tab ──────────────────────────────────────────── */}
            {activeTab === 'proposal' && (
              <ProposalTab project={project} tasks={tasks} costSummary={costSummary} changeOrders={changeOrders} scopeId={scopeId ?? ''} onReload={load} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// ─── Proposal Tab ─────────────────────────────────────────────────────────────

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

interface ProposalTabProps {
  project: ScopeProject;
  tasks: ScopeTask[];
  costSummary: CostSummary | null;
  changeOrders: ChangeOrder[];
  scopeId: string;
  onReload: () => Promise<void>;
}

function ProposalTab({ project, tasks, costSummary, changeOrders, scopeId, onReload }: ProposalTabProps) {
  const [form, setForm] = useState({
    proposalPaymentSchedule: project.proposalPaymentSchedule ?? '50% deposit upon contract signing, 25% at project midpoint, 25% upon completion.',
    proposalDuration: project.proposalDuration ?? 'To be confirmed upon scheduling',
    proposalWarranty: project.proposalWarranty ?? '1-year workmanship warranty on all labor. Material warranties per manufacturer.',
    proposalExclusions: project.proposalExclusions ?? 'Work not listed in scope above. Unforeseen structural, plumbing, or electrical issues discovered during demolition.',
    proposalNotes: project.proposalNotes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/scope/${scopeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    await onReload();
  };

  const approvedCOs = changeOrders.filter(co => co.status === 'approved');
  const coTotal = approvedCOs.reduce((s, co) => s + Number(co.priceAdjustment), 0);
  const basePrice = Number(costSummary?.sellingPrice ?? project.sellingPrice ?? 0);
  const totalPrice = basePrice + coTotal;

  const tasksByPhase = PHASES.map(ph => ({ phase: ph, tasks: tasks.filter(t => t.phase === ph) }));

  return (
    <div className="space-y-5">
      {/* Editable proposal fields */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Proposal Details</h3>
        <div>
          <label className={labelCls}>Payment Schedule</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={form.proposalPaymentSchedule} onChange={e => setForm(f => ({ ...f, proposalPaymentSchedule: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Estimated Project Duration</label>
          <input className={inputCls} value={form.proposalDuration} onChange={e => setForm(f => ({ ...f, proposalDuration: e.target.value }))} placeholder="e.g. 2–3 weeks (subject to confirmation)" />
        </div>
        <div>
          <label className={labelCls}>Warranty Terms</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.proposalWarranty} onChange={e => setForm(f => ({ ...f, proposalWarranty: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Exclusions</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.proposalExclusions} onChange={e => setForm(f => ({ ...f, proposalExclusions: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Additional Notes</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.proposalNotes} onChange={e => setForm(f => ({ ...f, proposalNotes: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => void handleSave()} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Proposal Details
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
            <Printer className="w-4 h-4" />
            {scope_detail.proposalPrintButton}
          </button>
        </div>
      </div>

      {/* Proposal preview */}
      <div id="proposal-print-area" className="bg-white text-gray-900 rounded-xl border border-border p-8 space-y-6 print:shadow-none print:border-0 print:rounded-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DUST TO DONE</h1>
            <p className="text-sm text-gray-600">RENOVATION SOLUTIONS LLC</p>
            <p className="text-xs text-gray-500 mt-1">Terre Haute, Indiana</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">PROJECT PROPOSAL</p>
            <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Customer & Project */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer</h2>
            <p className="text-sm font-semibold text-gray-900">{project.customerName}</p>
            {project.customerEmail && <p className="text-xs text-gray-600">{project.customerEmail}</p>}
            {project.customerPhone && <p className="text-xs text-gray-600">{project.customerPhone}</p>}
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Project</h2>
            <p className="text-sm font-semibold text-gray-900">{project.projectName}</p>
            {project.jobAddress && <p className="text-xs text-gray-600">{project.jobAddress}</p>}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Project Description</h2>
            <p className="text-sm text-gray-700">{project.description}</p>
          </div>
        )}

        {/* Scope of Work */}
        {tasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Scope of Work</h2>
            {tasksByPhase.filter(p => p.tasks.length > 0).map(({ phase, tasks: phaseTasks }) => (
              <div key={phase} className="mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-1">{phaseLabel(phase)}</h3>
                <ul className="space-y-0.5">
                  {phaseTasks.map(t => (
                    <li key={t.id} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{t.description}</span>
                      {t.flagged === 1 && <span className="text-xs text-orange-600 font-medium">(Permit/Licensed Trade)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Exclusions */}
        {form.proposalExclusions && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Exclusions</h2>
            <p className="text-sm text-gray-700">{form.proposalExclusions}</p>
          </div>
        )}

        {/* Pricing */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Project Price</h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-700">Base Project Price</span>
            <span className="text-sm font-semibold text-gray-900">{fmt(basePrice)}</span>
          </div>
          {approvedCOs.map(co => (
            <div key={co.id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">Change Order: {co.title}</span>
              <span className="text-sm font-semibold text-gray-900">+{fmt(co.priceAdjustment)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-base font-bold text-gray-900">TOTAL PROJECT PRICE</span>
            <span className="text-xl font-bold text-gray-900">{fmt(totalPrice)}</span>
          </div>
        </div>

        {/* Payment Schedule */}
        {form.proposalPaymentSchedule && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment Schedule</h2>
            <p className="text-sm text-gray-700">{form.proposalPaymentSchedule}</p>
          </div>
        )}

        {/* Duration */}
        {form.proposalDuration && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estimated Project Duration</h2>
            <p className="text-sm text-gray-700">{form.proposalDuration}</p>
            <p className="text-xs text-gray-500 mt-1">Scheduling is subject to confirmation and material availability.</p>
          </div>
        )}

        {/* Warranty */}
        {form.proposalWarranty && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Warranty</h2>
            <p className="text-sm text-gray-700">{form.proposalWarranty}</p>
          </div>
        )}

        {/* Change Order Conditions */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Change Order Conditions</h2>
          <p className="text-sm text-gray-700">Any changes to the scope of work must be agreed upon in writing via a signed change order before additional work begins. Change orders may affect the project price and schedule.</p>
        </div>

        {/* Notes */}
        {form.proposalNotes && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Additional Notes</h2>
            <p className="text-sm text-gray-700">{form.proposalNotes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="border-t-2 border-gray-900 pt-6 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Customer Approval</p>
            <div className="border-b border-gray-400 mb-1 h-10"></div>
            <p className="text-xs text-gray-500">Customer Signature</p>
            <div className="border-b border-gray-400 mb-1 h-8 mt-4"></div>
            <p className="text-xs text-gray-500">Date</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Dust to Done Renovation Solutions LLC</p>
            <div className="border-b border-gray-400 mb-1 h-10"></div>
            <p className="text-xs text-gray-500">Authorized Signature</p>
            <div className="border-b border-gray-400 mb-1 h-8 mt-4"></div>
            <p className="text-xs text-gray-500">Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
