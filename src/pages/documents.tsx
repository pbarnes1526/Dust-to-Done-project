import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search, X, Save,
  Trash2, Upload, FileImage, File, AlertCircle, Eye, Download,
  Filter, Tag, BookOpen,
  DollarSign, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doc {
  id: number;
  jobId: number;
  name: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  category: 'contract' | 'permit' | 'photo' | 'estimate' | 'other';
  notes: string | null;
  createdAt: string;
}

interface DocRow { doc: Doc; jobName: string | null; }
interface Job { id: number; name: string; clientName: string; }

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

function fmtBytes(n: number | null) {
  if (!n) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  contract: { label: 'Contract',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   icon: FileText },
  permit:   { label: 'Permit',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Tag },
  photo:    { label: 'Photo',     color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: FileImage },
  estimate: { label: 'Estimate',  color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: ClipboardList },
  other:    { label: 'Other',     color: 'bg-muted text-muted-foreground border-border',        icon: File },
};

function CategoryBadge({ category }: { category: string }) {
  const m = CATEGORY_META[category] ?? CATEGORY_META.other;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.color}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

function isImage(fileType: string | null) {
  return fileType?.startsWith('image/') ?? false;
}

function isPdf(fileType: string | null) {
  return fileType === 'application/pdf';
}

// ─── File Icon ────────────────────────────────────────────────────────────────

function FileIcon({ fileType, className = 'w-8 h-8' }: { fileType: string | null; className?: string }) {
  if (isImage(fileType)) return <FileImage className={`${className} text-green-400`} />;
  if (isPdf(fileType)) return <FileText className={`${className} text-red-400`} />;
  return <File className={`${className} text-muted-foreground`} />;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onFile: (file: File) => void;
  uploading: boolean;
}

function UploadZone({ onFile, uploading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      {uploading
        ? <p className="text-sm text-muted-foreground">Uploading…</p>
        : <>
            <p className="text-sm font-semibold text-foreground">Drop a file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, images, Word docs, spreadsheets — up to 50 MB</p>
          </>}
    </div>
  );
}

// ─── Add Document Form ────────────────────────────────────────────────────────

interface AddDocFormProps {
  jobs: Job[];
  onSave: (data: { jobId: number; name: string; fileUrl: string; fileType: string; fileSize: number; category: Doc['category']; notes: string }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function AddDocForm({ jobs, onSave, onCancel, saving, error }: AddDocFormProps) {
  const [jobId, setJobId] = useState<number | null>(jobs[0]?.id ?? null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Doc['category']>('other');
  const [notes, setNotes] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedType, setUploadedType] = useState('');
  const [uploadedSize, setUploadedSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json() as { url: string; originalName: string; mimeType: string; size: number };
      setUploadedUrl(data.url);
      setUploadedType(data.mimeType);
      setUploadedSize(data.size);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
    } catch (e) { setUploadError(String(e)); }
    finally { setUploading(false); }
  };

  const inp = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const lbl = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={e => {
      e.preventDefault();
      if (!jobId || !uploadedUrl) return;
      void onSave({ jobId, name, fileUrl: uploadedUrl, fileType: uploadedType, fileSize: uploadedSize, category, notes });
    }} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={lbl}>Job *</label>
          <select className={inp} value={jobId ?? ''} onChange={e => setJobId(Number(e.target.value))} required>
            <option value="">— Select a job —</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.name} – {j.clientName}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Document Name *</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Signed Contract" required />
        </div>
        <div>
          <label className={lbl}>Category</label>
          <select className={inp} value={category} onChange={e => setCategory(e.target.value as Doc['category'])}>
            <option value="contract">Contract</option>
            <option value="permit">Permit</option>
            <option value="photo">Photo</option>
            <option value="estimate">Estimate</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={lbl}>Notes</label>
          <textarea className={inp + ' resize-none'} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this document…" />
        </div>
      </div>

      <div>
        <label className={lbl}>File *</label>
        {uploadedUrl
          ? (
            <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg px-4 py-3">
              <FileIcon fileType={uploadedType} className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name || 'Uploaded file'}</p>
                <p className="text-xs text-muted-foreground">{fmtBytes(uploadedSize)}</p>
              </div>
              <button type="button" onClick={() => { setUploadedUrl(''); setUploadedType(''); setUploadedSize(0); }}
                className="text-muted-foreground hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )
          : <UploadZone onFile={handleFile} uploading={uploading} />}
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button type="submit" disabled={saving || !uploadedUrl || !jobId}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Document'}
        </button>
      </div>
    </form>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocCardProps {
  row: DocRow;
  onDelete: (doc: Doc) => void;
  onEdit: (doc: Doc) => void;
}

function DocCard({ row, onDelete, onEdit }: DocCardProps) {
  const { doc, jobName } = row;
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 flex gap-4 hover:border-primary/30 transition-colors group">
        {/* Thumbnail / icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {isImage(doc.fileType)
            ? <img src={doc.fileUrl} alt={doc.name} className="w-full h-full object-cover" />
            : <FileIcon fileType={doc.fileType} className="w-7 h-7" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{jobName ?? '—'}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {(isImage(doc.fileType) || isPdf(doc.fileType)) && (
                <button onClick={() => setPreviewOpen(true)} title="Preview"
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              <a href={doc.fileUrl} download={doc.name} title="Download"
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => onEdit(doc)} title="Edit"
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(doc)} title="Delete"
                className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <CategoryBadge category={doc.category} />
            <span className="text-xs text-muted-foreground">{fmtBytes(doc.fileSize)}</span>
            <span className="text-xs text-muted-foreground">{fmtDate(doc.createdAt)}</span>
          </div>
          {doc.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{doc.notes}</p>}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative bg-card border border-border rounded-xl overflow-hidden max-w-3xl w-full max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                <div className="flex items-center gap-2">
                  <a href={doc.fileUrl} download={doc.name}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/20">
                {isImage(doc.fileType)
                  ? <img src={doc.fileUrl} alt={doc.name} className="max-w-full max-h-full object-contain rounded" />
                  : isPdf(doc.fileType)
                    ? <iframe src={doc.fileUrl} title={doc.name} className="w-full h-full min-h-[500px] rounded border-0" />
                    : <div className="text-center text-muted-foreground"><File className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">Preview not available</p></div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Edit Doc Modal ───────────────────────────────────────────────────────────

interface EditDocModalProps {
  doc: Doc;
  onSave: (id: number, data: { name: string; category: Doc['category']; notes: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EditDocModal({ doc, onSave, onClose, saving }: EditDocModalProps) {
  const [name, setName] = useState(doc.name);
  const [category, setCategory] = useState<Doc['category']>(doc.category);
  const [notes, setNotes] = useState(doc.notes ?? '');

  const inp = 'w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';
  const lbl = 'block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Edit Document</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); void onSave(doc.id, { name, category, notes }); }} className="space-y-4">
          <div>
            <label className={lbl}>Name</label>
            <input className={inp} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select className={inp} value={category} onChange={e => setCategory(e.target.value as Doc['category'])}>
              <option value="contract">Contract</option>
              <option value="permit">Permit</option>
              <option value="photo">Photo</option>
              <option value="estimate">Estimate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [rows, setRows] = useState<DocRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, jobRes] = await Promise.all([fetch('/api/documents'), fetch('/api/jobs')]);
      const [docData, jobData] = await Promise.all([docRes.json() as Promise<DocRow[]>, jobRes.json() as Promise<Job[]>]);
      setRows(docData);
      setJobs(jobData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const filtered = rows.filter(({ doc, jobName }) => {
    const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (jobName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.notes ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || doc.category === filterCategory;
    const matchJob = filterJob === 'all' || String(doc.jobId) === filterJob;
    return matchSearch && matchCat && matchJob;
  });

  // Group by job
  const grouped = filtered.reduce<Record<string, { jobName: string; rows: DocRow[] }>>((acc, row) => {
    const key = String(row.doc.jobId);
    if (!acc[key]) acc[key] = { jobName: row.jobName ?? 'Unknown Job', rows: [] };
    acc[key].rows.push(row);
    return acc;
  }, {});

  const counts = {
    contract: rows.filter(r => r.doc.category === 'contract').length,
    permit: rows.filter(r => r.doc.category === 'permit').length,
    photo: rows.filter(r => r.doc.category === 'photo').length,
    estimate: rows.filter(r => r.doc.category === 'estimate').length,
    other: rows.filter(r => r.doc.category === 'other').length,
  };

  const handleSave = async (data: { jobId: number; name: string; fileUrl: string; fileType: string; fileSize: number; category: Doc['category']; notes: string }) => {
    setSaving(true); setFormError(null);
    try {
      const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to save document');
      await fetchAll();
      setShowForm(false);
    } catch (e) { setFormError(String(e)); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: number, data: { name: string; category: Doc['category']; notes: string }) => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await fetchAll();
      setEditingDoc(null);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    await fetchAll();
  };

  return (
    <>
      <Helmet>
        <title>Documents – Dust to Done</title>
        <meta name="description" content="Upload and organize contracts, permits, photos, and project documents by job." />
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
              const active = id === 'documents';
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
              <h1 className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Documents</h1>
              <p className="text-xs text-muted-foreground">{rows.length} file{rows.length !== 1 ? 's' : ''} across {jobs.length} jobs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-52" />
              </div>
              <NotificationBell />
              <button onClick={() => { setShowForm(true); setFormError(null); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> Upload Document
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* KPI strip */}
            {!showForm && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(['contract', 'permit', 'photo', 'estimate', 'other'] as const).map(cat => {
                  const m = CATEGORY_META[cat];
                  const Icon = m.icon;
                  return (
                    <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                      className={`bg-card border rounded-lg p-3 text-left transition-colors ${filterCategory === cat ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{m.label}s</span>
                      </div>
                      <p className="text-lg font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{counts[cat]}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Upload form */}
            <AnimatePresence>
              {showForm && (
                <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Upload Document</h2>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <AddDocForm jobs={jobs} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filters */}
            {!showForm && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="w-3.5 h-3.5" /> Job:
                </div>
                <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
                  className="bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">All Jobs</option>
                  {jobs.map(j => <option key={j.id} value={String(j.id)}>{j.name}</option>)}
                </select>
                {filterCategory !== 'all' && (
                  <button onClick={() => setFilterCategory('all')}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                    <X className="w-3 h-3" /> Clear category filter
                  </button>
                )}
              </div>
            )}

            {/* Document list */}
            {!showForm && (
              loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{search || filterCategory !== 'all' || filterJob !== 'all' ? 'No documents match your filters.' : 'No documents yet. Upload your first file.'}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([jobId, group]) => (
                    <div key={jobId}>
                      <div className="flex items-center gap-2 mb-3">
                        <HardHat className="w-3.5 h-3.5 text-muted-foreground" />
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{group.jobName}</h3>
                        <span className="text-xs text-muted-foreground">({group.rows.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.rows.map(row => (
                          <DocCard key={row.doc.id} row={row} onDelete={handleDelete} onEdit={setEditingDoc} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </main>
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingDoc && (
          <EditDocModal doc={editingDoc} onSave={handleEdit} onClose={() => setEditingDoc(null)} saving={saving} />
        )}
      </AnimatePresence>
    </>
  );
}
