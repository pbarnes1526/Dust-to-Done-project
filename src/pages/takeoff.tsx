import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router';
import { takeoff } from 'virtual:content';
import {
  HardHat, Plus, Search, X, Pencil, Trash2, Copy, ChevronRight,
  AlertCircle, Loader2, ClipboardList, Calendar, User, MapPin, CheckCircle2,
  FileText, Sparkles,
} from 'lucide-react';

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
  linkedJobId: number | null;
  materialCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  analyzed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  complete: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const EMPTY_FORM = {
  projectName: '', customerName: '', customerEmail: '', customerPhone: '',
  address: '', description: '', dimensions: '', notes: '',
};

export default function TakeoffPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TakeoffProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<TakeoffProject | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/takeoff').then(r => r.json()) as TakeoffProject[];
      if (Array.isArray(data)) setProjects(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => {
    setEditingProject(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: TakeoffProject) => {
    setEditingProject(p);
    setForm({
      projectName: p.projectName, customerName: p.customerName,
      customerEmail: p.customerEmail ?? '', customerPhone: p.customerPhone ?? '',
      address: p.address ?? '', description: p.description ?? '',
      dimensions: p.dimensions ?? '', notes: p.notes ?? '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.projectName.trim() || !form.customerName.trim()) {
      setFormError('Project name and customer name are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const url = editingProject ? `/api/takeoff/${editingProject.id}` : '/api/takeoff';
      const method = editingProject ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved = await res.json() as TakeoffProject;
      if (editingProject) {
        setProjects(ps => ps.map(p => p.id === saved.id ? { ...saved, materialCount: p.materialCount } : p));
        setShowForm(false);
      } else {
        void navigate(`/takeoff/${saved.id}`);
        return;
      }
    } catch (e) {
      setFormError(String(e));
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this takeoff project and all its materials? This cannot be undone.')) return;
    setDeletingId(id);
    await fetch(`/api/takeoff/${id}`, { method: 'DELETE' });
    setProjects(ps => ps.filter(p => p.id !== id));
    setDeletingId(null);
  };

  const handleDuplicate = async (id: number) => {
    setDuplicatingId(id);
    try {
      const res = await fetch(`/api/takeoff/${id}/duplicate`, { method: 'POST' });
      const copy = await res.json() as TakeoffProject;
      void navigate(`/takeoff/${copy.id}`);
    } catch { /* ignore */ }
    setDuplicatingId(null);
  };

  const filtered = projects.filter(p =>
    !search ||
    p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.customerName.toLowerCase().includes(search.toLowerCase()) ||
    (p.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  const statusLabel = (s: string) => {
    if (s === 'draft') return takeoff.statusDraft;
    if (s === 'analyzed') return takeoff.statusAnalyzed;
    return takeoff.statusComplete;
  };

  return (
    <>
      <Helmet>
        <title>{takeoff.metaTitle}</title>
        <meta name="description" content={takeoff.metaDescription} />
      </Helmet>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground font-[Barlow]">{takeoff.pageTitle}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{takeoff.pageDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> <span>{takeoff.newProjectButton}</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{takeoff.statTotal}</span></div>
            <p className="text-xl font-bold text-foreground">{projects.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{takeoff.statDraft}</span></div>
            <p className="text-xl font-bold text-foreground">{projects.filter(p => p.status === 'draft').length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1"><Sparkles className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{takeoff.statAnalyzed}</span></div>
            <p className="text-xl font-bold text-foreground">{projects.filter(p => p.status === 'analyzed').length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{takeoff.statComplete}</span></div>
            <p className="text-xl font-bold text-foreground">{projects.filter(p => p.status === 'complete').length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={takeoff.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Project list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <HardHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground font-semibold mb-1">{search ? takeoff.emptySearchTitle : takeoff.emptyTitle}</p>
            <p className="text-sm text-muted-foreground mb-4">{search ? takeoff.emptySearchDescription : takeoff.emptyDescription}</p>
            {!search && (
              <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {takeoff.emptyButton}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(project => (
              <div key={project.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[project.status]}`}>
                        {statusLabel(project.status)}
                      </span>
                      {project.materialCount > 0 && (
                        <span className="text-xs text-muted-foreground">{project.materialCount} <span>{takeoff.materialsLabel}</span></span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{project.projectName}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => openEdit(project)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void handleDuplicate(project.id)} disabled={duplicatingId === project.id} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors" title="Duplicate">
                      {duplicatingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => void handleDelete(project.id)} disabled={deletingId === project.id} className="p-1.5 text-muted-foreground hover:text-red-400 rounded transition-colors" title="Delete">
                      {deletingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{project.customerName}</span>
                  </div>
                  {project.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{project.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => void navigate(`/takeoff/${project.id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  <span>{takeoff.openProjectButton}</span> <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground font-[Barlow]">
                {editingProject ? takeoff.editTitle : takeoff.createTitle}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>{takeoff.labelProjectName}</label>
                  <input className={inputCls} value={form.projectName} onChange={set('projectName')} placeholder={takeoff.placeholderProjectName} />
                </div>
                <div>
                  <label className={labelCls}>{takeoff.labelCustomerName}</label>
                  <input className={inputCls} value={form.customerName} onChange={set('customerName')} placeholder={takeoff.placeholderCustomerName} />
                </div>
                <div>
                  <label className={labelCls}>{takeoff.labelCustomerPhone}</label>
                  <input className={inputCls} value={form.customerPhone} onChange={set('customerPhone')} placeholder={takeoff.placeholderCustomerPhone} />
                </div>
                <div>
                  <label className={labelCls}>{takeoff.labelCustomerEmail}</label>
                  <input className={inputCls} type="email" value={form.customerEmail} onChange={set('customerEmail')} placeholder={takeoff.placeholderCustomerEmail} />
                </div>
                <div>
                  <label className={labelCls}>{takeoff.labelAddress}</label>
                  <input className={inputCls} value={form.address} onChange={set('address')} placeholder={takeoff.placeholderAddress} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{takeoff.labelDescription}</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={form.description} onChange={set('description')} placeholder={takeoff.placeholderDescription} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{takeoff.labelDimensions}</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={form.dimensions} onChange={set('dimensions')} placeholder={takeoff.placeholderDimensions} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{takeoff.labelNotes}</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes} onChange={set('notes')} placeholder={takeoff.placeholderNotes} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 transition-colors">{takeoff.cancelButton}</button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{editingProject ? takeoff.saveButton : takeoff.createButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
