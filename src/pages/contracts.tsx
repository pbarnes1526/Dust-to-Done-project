import { contracts } from 'virtual:content';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, HardHat, Receipt, ClipboardList, FileText, FolderOpen,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, Search,
  Trash2, X, Save, FileSignature, Printer, CheckCircle2, Clock, Ban,
  DollarSign, BookOpen, Sparkles, Calendar, UserCheck, Package, PenLine, Send,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { LogoutButton, useSession } from '@/lib/auth/auth-client';

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMSMeta = [
  {
    icon: LayoutDashboard
  },
  {
    icon: HardHat
  },
  {
    icon: Calendar
  },
  {
    icon: UserCheck
  },
  {
    icon: Users
  },
  {
    icon: ClipboardList
  },
  {
    icon: Receipt
  },
  {
    icon: FileText
  },
  {
    icon: DollarSign
  },
  {
    icon: FileSignature
  },
  {
    icon: Package
  },
  {
    icon: FolderOpen
  },
  {
    icon: Users
  },
  {
    icon: BarChart3
  },
  {
    icon: BookOpen
  },
  {
    icon: Sparkles
  },
  {
    icon: ClipboardList
  },
  {
    icon: Settings
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contract {
  id: number;
  jobId: number | null;
  contractNumber: string | null;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  contractorName: string | null;
  contractorLicense: string | null;
  contractorPhone: string | null;
  contractorEmail: string | null;
  contractorAddress: string | null;
  projectAddress: string | null;
  projectDescription: string | null;
  scopeOfWork: string | null;
  contractAmount: string;
  depositAmount: string;
  depositDueDate: string | null;
  paymentSchedule: string | null;
  startDate: string | null;
  estimatedEndDate: string | null;
  signedDate: string | null;
  warrantyPeriod: string | null;
  terms: string | null;
  notes: string | null;
  clientSignature: string | null;
  contractorSignature: string | null;
  createdAt: string;
}

interface ContractRow { contract: Contract; jobName: string | null; }
interface Job { id: number; name: string; clientName: string; }
interface Customer { id: number; name: string; email: string | null; phone: string | null; address: string | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: 'bg-muted text-muted-foreground border-border',            icon: Clock },
  sent:      { label: 'Sent',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         icon: FileText },
  signed:    { label: 'Signed',    color: 'bg-green-500/15 text-green-400 border-green-500/30',      icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30',            icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${m.color}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

// Converts a typed name to a canvas data URL using a cursive font
function nameToDataURL(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "italic 52px 'Dancing Script', 'Brush Script MT', cursive";
  // Use a near-black neutral — safe for a print/white-bg canvas (not a palette surface)
  ctx.fillStyle = 'rgb(26 26 26)';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 16, 62);
  return canvas.toDataURL();
}

function SignaturePad({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value && !typedName) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [mode, value, typedName]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(26 26 26)';
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL());
  }

  function clear() {
    setTypedName('');
    if (mode === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    onChange(null);
  }

  function handleTypedName(name: string) {
    setTypedName(name);
    if (name.trim()) {
      onChange(nameToDataURL(name.trim()));
    } else {
      onChange(null);
    }
  }

  function switchMode(next: 'type' | 'draw') {
    setMode(next);
    setTypedName('');
    onChange(null);
    if (next === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          {value && (
            <button type="button" onClick={clear} className="text-xs text-destructive hover:underline">Clear</button>
          )}
          <div className="flex rounded-md border border-input overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => switchMode('type')}
              className={`px-2.5 py-1 transition-colors ${mode === 'type' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              Type
            </button>
            <button
              type="button"
              onClick={() => switchMode('draw')}
              className={`px-2.5 py-1 transition-colors ${mode === 'draw' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              Draw
            </button>
          </div>
        </div>
      </div>

      {mode === 'type' ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={typedName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTypedName(e.target.value)}
            placeholder="Type full name to sign..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {typedName.trim() ? (
            <div className="rounded-lg border border-input bg-white px-4 py-2 min-h-[64px] flex items-center">
              <span style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: '2.2rem', fontStyle: 'italic' }} className="text-gray-900">
                {typedName}
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-input bg-background min-h-[64px] flex items-center justify-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" /> Your typed name will appear as a signature
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-lg border border-input bg-background overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={120}
            className="w-full h-24 cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!value && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" /> Sign here
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(): Omit<Contract, 'id' | 'createdAt'> {
  return {
    jobId: null, contractNumber: '', status: 'draft',
    clientName: '', clientEmail: '', clientPhone: '', clientAddress: '',
    contractorName: 'Dust to Done Renovation Solutions LLC',
    contractorLicense: 'CL0003489', contractorPhone: '(812) 201-4977', contractorEmail: 'paul@dusttodonerenovationsolutions.com', contractorAddress: '1529 North Avenue, Terre Haute, IN 47804',
    projectAddress: '', projectDescription: '', scopeOfWork: '',
    contractAmount: '0', depositAmount: '0', depositDueDate: '', paymentSchedule: '',
    startDate: '', estimatedEndDate: '', signedDate: '',
    warrantyPeriod: '1 year on workmanship', terms: DEFAULT_TERMS, notes: '',
    clientSignature: null, contractorSignature: null,
  };
}

const DEFAULT_TERMS = `1. PAYMENT TERMS: A deposit is due upon signing. The remaining balance is due upon project completion unless a payment schedule is specified above.

2. CHANGES: Any changes to the scope of work must be agreed upon in writing and may result in additional charges.

3. PERMITS: Contractor will obtain all necessary permits unless otherwise agreed in writing.

4. MATERIALS: All materials provided by Contractor are warranted against defects. Client-supplied materials are not covered under warranty.

5. DELAYS: Contractor is not responsible for delays caused by weather, material shortages, or other circumstances beyond Contractor's control.

6. DISPUTE RESOLUTION: Any disputes shall first be attempted to be resolved through mediation before pursuing legal action.

7. LIEN RIGHTS: Contractor reserves the right to file a mechanic's lien if payment is not received as agreed.

8. INSURANCE: Contractor maintains general liability insurance and workers' compensation coverage.

9. SITE CONDITIONS: Owner shall provide Contractor with reasonable access to the project site during normal working hours. Contractor shall not be responsible for concealed conditions not reasonably discoverable before work begins.

10. TERMINATION: Either Party may terminate this Agreement upon written notice if the other party materially breaches the Agreement and fails to cure the breach within ten (10) days after receiving written notice.

11. ENTIRE AGREEMENT: This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, negotiations, and understandings.`;

// ─── Print View ───────────────────────────────────────────────────────────────

function PrintView({ contract, jobName, onClose }: { contract: Contract; jobName: string | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto print:bg-white">
      <div className="max-w-3xl mx-auto p-8 print:p-0">
        {/* Print toolbar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={onClose} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>

        {/* Contract document */}
        <div className="bg-white text-gray-900 rounded-xl shadow-xl p-10 print:shadow-none print:rounded-none print:p-0" style={{ fontFamily: 'Georgia, serif' }}>
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-6 mb-6">
            <div className="flex items-center justify-between gap-4">
              <img
                src="/airo-assets/images/logo/horizontal"
                alt="Dust to Done Renovation Solutions LLC"
                className="h-14 w-auto object-contain"
              />
              <div className="text-right">
                <h1 className="text-2xl font-bold tracking-wide uppercase">Renovation Contract</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {contract.contractNumber ? `Contract #${contract.contractNumber}` : ''}{' '}
                  {contract.signedDate ? `· Signed ${fmtDate(contract.signedDate)}` : ''}
                </p>
                {jobName && <p className="text-sm text-gray-600">Project: {jobName}</p>}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Client</h2>
              <p className="font-semibold">{contract.clientName}</p>
              {contract.clientAddress && <p className="text-sm text-gray-700 whitespace-pre-line">{contract.clientAddress}</p>}
              {contract.clientPhone && <p className="text-sm text-gray-700">{contract.clientPhone}</p>}
              {contract.clientEmail && <p className="text-sm text-gray-700">{contract.clientEmail}</p>}
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Contractor</h2>
              <p className="font-semibold">{contract.contractorName || 'Dust to Done Renovation Solutions LLC'}</p>
              {contract.contractorLicense && <p className="text-sm text-gray-700">Lic # {contract.contractorLicense}</p>}
              {contract.contractorAddress && <p className="text-sm text-gray-700 whitespace-pre-line">{contract.contractorAddress}</p>}
              {contract.contractorPhone && <p className="text-sm text-gray-700">{contract.contractorPhone}</p>}
              {contract.contractorEmail && <p className="text-sm text-gray-700">{contract.contractorEmail}</p>}
            </div>
          </div>

          {/* Project */}
          {contract.projectAddress && (
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Project Address</h2>
              <p className="text-sm">{contract.projectAddress}</p>
            </div>
          )}
          {contract.projectDescription && (
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Project Description</h2>
              <p className="text-sm whitespace-pre-line">{contract.projectDescription}</p>
            </div>
          )}
          {contract.scopeOfWork && (
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Scope of Work</h2>
              <p className="text-sm whitespace-pre-line">{contract.scopeOfWork}</p>
            </div>
          )}

          {/* Financials */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Contract Amount</p>
                <p className="text-xl font-bold">{fmt(contract.contractAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Deposit Due</p>
                <p className="text-xl font-bold">{fmt(contract.depositAmount)}</p>
                {contract.depositDueDate && <p className="text-xs text-gray-500">Due {fmtDate(contract.depositDueDate)}</p>}
              </div>
            </div>
            {contract.paymentSchedule && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Payment Schedule</p>
                <p className="text-sm whitespace-pre-line">{contract.paymentSchedule}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            {contract.startDate && <div><p className="text-xs text-gray-500 uppercase tracking-widest">Start Date</p><p>{fmtDate(contract.startDate)}</p></div>}
            {contract.estimatedEndDate && <div><p className="text-xs text-gray-500 uppercase tracking-widest">Est. Completion</p><p>{fmtDate(contract.estimatedEndDate)}</p></div>}
            {contract.warrantyPeriod && <div><p className="text-xs text-gray-500 uppercase tracking-widest">Warranty</p><p>{contract.warrantyPeriod}</p></div>}
          </div>

          {/* Terms */}
          {contract.terms && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Terms & Conditions</h2>
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{contract.terms}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t-2 border-gray-900">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Client Signature</p>
              {contract.clientSignature
                ? <img src={contract.clientSignature} alt="Client signature" className="h-16 border-b border-gray-400" />
                : <div className="h-16 border-b border-gray-400" />}
              <p className="text-sm mt-1">{contract.clientName}</p>
              {contract.signedDate && <p className="text-xs text-gray-500">Date: {fmtDate(contract.signedDate)}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Contractor Signature</p>
              {contract.contractorSignature
                ? <img src={contract.contractorSignature} alt="Contractor signature" className="h-16 border-b border-gray-400" />
                : <div className="h-16 border-b border-gray-400" />}
              <p className="text-sm mt-1">{contract.contractorName || 'Dust to Done Renovation Solutions LLC'}</p>
              {contract.signedDate && <p className="text-xs text-gray-500">Date: {fmtDate(contract.signedDate)}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isPending } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<Omit<Contract, 'id' | 'createdAt'>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [printContract, setPrintContract] = useState<{ contract: Contract; jobName: string | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (!isPending && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, isPending, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, jRes, custRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/jobs'),
        fetch('/api/customers'),
      ]);
      if (cRes.ok) setRows(await cRes.json());
      if (jRes.ok) setJobs(await jRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
  }

  function openEdit(row: ContractRow) {
    setEditing(row.contract);
    setForm({ ...row.contract });
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function sendToClient() {
    if (!editing) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/contracts/${editing.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { ok?: boolean; error?: string; sentTo?: string };
      if (!res.ok) {
        setSendResult({ ok: false, msg: data.error ?? 'Failed to send email.' });
      } else {
        setSendResult({ ok: true, msg: `Sent to ${data.sentTo ?? 'client'}` });
        // Refresh to pick up status change to 'sent'
        await load();
      }
    } catch {
      setSendResult({ ok: false, msg: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        contractAmount: form.contractAmount || '0',
        depositAmount: form.depositAmount || '0',
      };
      if (editing) {
        await fetch(`/api/contracts/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setEditing(null);
      setForm(emptyForm());
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(id: number) {
    await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    await load();
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.contract.clientName.toLowerCase().includes(q) ||
      (r.contract.contractNumber ?? '').toLowerCase().includes(q) ||
      (r.jobName ?? '').toLowerCase().includes(q) ||
      (r.contract.projectAddress ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || r.contract.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const textareaCls = inputCls + ' resize-none';
  const labelCls = 'text-xs font-medium text-muted-foreground';

  const showForm = editing !== null || rows.length === 0;

  return (
    <>
      <Helmet>
        <title>Contracts — Dust to Done</title>
        <meta name="description" content="Create, manage, and sign renovation contracts for Dust to Done projects." />
        <meta name="robots" content="noindex" />
      </Helmet>
      {printContract && (
        <PrintView
          contract={printContract.contract}
          jobName={printContract.jobName}
          onClose={() => setPrintContract(null)}
        />
      )}
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200`}>
          <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border">
            {sidebarOpen && (
              <span className="text-sm font-bold text-sidebar-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                Dust to Done
              </span>
            )}
            <button onClick={() => setSidebarOpen(v => !v)} className="p-1 rounded hover:bg-sidebar-accent/20 text-sidebar-foreground ml-auto">
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {contracts.NAV_ITEMS.map((item, _airoIdx) => {
              const Icon = NAV_ITEMSMeta[_airoIdx].icon;
              const active = item.id === 'contracts';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${active ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold' : 'text-sidebar-foreground hover:bg-sidebar-accent/10'}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
          {sidebarOpen && (
            <div className="p-3 border-t border-sidebar-border">
              <LogoutButton className="w-full text-xs text-muted-foreground hover:text-foreground py-1" />
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <FileSignature className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Contracts</h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> New Contract
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6">
            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">

              {/* List panel */}
              <div className="flex-1 min-w-0">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Search contracts…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="signed">Signed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                    <FileSignature className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No contracts yet. Create your first one.</p>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                      <Plus className="h-4 w-4" /> New Contract
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filtered.map(r => (
                      <div
                        key={r.contract.id}
                        className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors ${editing?.id === r.contract.id ? 'border-primary' : 'border-border'}`}
                        onClick={() => openEdit(r)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground truncate">{r.contract.clientName}</p>
                              {r.contract.contractNumber && (
                                <span className="text-xs text-muted-foreground">#{r.contract.contractNumber}</span>
                              )}
                              <StatusBadge status={r.contract.status} />
                            </div>
                            {r.jobName && <p className="text-xs text-muted-foreground mt-0.5">Job: {r.jobName}</p>}
                            {r.contract.projectAddress && <p className="text-xs text-muted-foreground truncate">{r.contract.projectAddress}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground">{fmt(r.contract.contractAmount)}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(r.contract.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={e => { e.stopPropagation(); setPrintContract({ contract: r.contract, jobName: r.jobName }); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(r.contract.id); }}
                            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded hover:bg-destructive/10 transition-colors ml-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form panel */}
              {(editing !== null || rows.length === 0 || showForm) && (
                <div className="w-full lg:w-[520px] flex-shrink-0">
                  <form onSubmit={save} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <h2 className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                        {editing ? 'Edit Contract' : 'New Contract'}
                      </h2>
                      {editing && (
                        <button type="button" onClick={() => { setEditing(null); setForm(emptyForm()); }} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="p-5 overflow-y-auto max-h-[calc(100vh-220px)] flex flex-col gap-5">

                      {/* Meta */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Contract Info</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Contract #</label>
                            <input className={inputCls} value={form.contractNumber ?? ''} onChange={set('contractNumber')} placeholder="CTR-001" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Status</label>
                            <select className={inputCls} value={form.status} onChange={set('status')}>
                              <option value="draft">Draft</option>
                              <option value="sent">Sent</option>
                              <option value="signed">Signed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-3">
                          <label className={labelCls}>Link to Job (optional)</label>
                          <select className={inputCls} value={form.jobId ?? ''} onChange={e => setForm(f => ({ ...f, jobId: e.target.value ? parseInt(e.target.value) : null }))}>
                            <option value="">— No job —</option>
                            {jobs.map(j => <option key={j.id} value={j.id}>{j.name} ({j.clientName})</option>)}
                          </select>
                        </div>
                      </section>

                      {/* Client */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Client</h3>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Select Existing Customer</label>
                            <select
                              className={inputCls}
                              value=""
                              onChange={e => {
                                const cust = customers.find(c => String(c.id) === e.target.value);
                                if (cust) setForm(f => ({
                                  ...f,
                                  clientName: cust.name,
                                  clientEmail: cust.email ?? f.clientEmail,
                                  clientPhone: cust.phone ?? f.clientPhone,
                                  clientAddress: cust.address ?? f.clientAddress,
                                }));
                              }}
                            >
                              <option value="">— Pick a customer to auto-fill —</option>
                              {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Client Name *</label>
                            <input className={inputCls} value={form.clientName} onChange={set('clientName')} placeholder="Jane Smith" required />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Phone</label>
                              <input className={inputCls} value={form.clientPhone ?? ''} onChange={set('clientPhone')} placeholder="(317) 555-0100" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Email</label>
                              <input className={inputCls} type="email" value={form.clientEmail ?? ''} onChange={set('clientEmail')} placeholder="client@email.com" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Client Address</label>
                            <input className={inputCls} value={form.clientAddress ?? ''} onChange={set('clientAddress')} placeholder="123 Main St, Indianapolis, IN 46201" />
                          </div>
                        </div>
                      </section>

                      {/* Contractor */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Contractor</h3>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Company Name</label>
                            <input className={inputCls} value={form.contractorName ?? ''} onChange={set('contractorName')} placeholder="Dust to Done Renovation Solutions LLC" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>License #</label>
                              <input className={inputCls} value={form.contractorLicense ?? ''} onChange={set('contractorLicense')} placeholder="CL0003489" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Phone</label>
                              <input className={inputCls} value={form.contractorPhone ?? ''} onChange={set('contractorPhone')} placeholder="(317) 555-0200" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Email</label>
                              <input className={inputCls} type="email" value={form.contractorEmail ?? ''} onChange={set('contractorEmail')} placeholder="info@dusttodone.com" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Address</label>
                              <input className={inputCls} value={form.contractorAddress ?? ''} onChange={set('contractorAddress')} placeholder="Indianapolis, IN" />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Project */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Project</h3>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Project Address</label>
                            <input className={inputCls} value={form.projectAddress ?? ''} onChange={set('projectAddress')} placeholder="456 Oak Ave, Indianapolis, IN 46202" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Project Description</label>
                            <textarea className={textareaCls} rows={2} value={form.projectDescription ?? ''} onChange={set('projectDescription')} placeholder="Brief description of the renovation project…" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Scope of Work</label>
                            <textarea className={textareaCls} rows={4} value={form.scopeOfWork ?? ''} onChange={set('scopeOfWork')} placeholder="Detailed list of work to be performed…" />
                          </div>
                        </div>
                      </section>

                      {/* Financials */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Financials</h3>
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Contract Amount ($)</label>
                              <input className={inputCls} type="number" min="0" step="0.01" value={form.contractAmount} onChange={set('contractAmount')} placeholder="25000" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className={labelCls}>Deposit Amount ($)</label>
                              <input className={inputCls} type="number" min="0" step="0.01" value={form.depositAmount} onChange={set('depositAmount')} placeholder="5000" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Deposit Due Date</label>
                            <input className={inputCls} type="date" value={form.depositDueDate ?? ''} onChange={set('depositDueDate')} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Payment Schedule</label>
                            <textarea className={textareaCls} rows={3} value={form.paymentSchedule ?? ''} onChange={set('paymentSchedule')} placeholder="e.g. 20% deposit, 40% at framing, 40% at completion…" />
                          </div>
                        </div>
                      </section>

                      {/* Dates */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Dates</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Start Date</label>
                            <input className={inputCls} type="date" value={form.startDate ?? ''} onChange={set('startDate')} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Est. Completion</label>
                            <input className={inputCls} type="date" value={form.estimatedEndDate ?? ''} onChange={set('estimatedEndDate')} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Signed Date</label>
                            <input className={inputCls} type="date" value={form.signedDate ?? ''} onChange={set('signedDate')} />
                          </div>
                        </div>
                      </section>

                      {/* Terms */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Terms</h3>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Warranty Period</label>
                            <input className={inputCls} value={form.warrantyPeriod ?? ''} onChange={set('warrantyPeriod')} placeholder="1 year on workmanship" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Terms & Conditions</label>
                            <textarea className={textareaCls} rows={8} value={form.terms ?? ''} onChange={set('terms')} placeholder="Contract terms…" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Internal Notes</label>
                            <textarea className={textareaCls} rows={2} value={form.notes ?? ''} onChange={set('notes')} placeholder="Internal notes (not printed)…" />
                          </div>
                        </div>
                      </section>

                      {/* Signatures */}
                      <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Signatures</h3>
                        <div className="flex flex-col gap-4">
                          <SignaturePad
                            label="Client Signature"
                            value={form.clientSignature}
                            onChange={v => setForm(f => ({ ...f, clientSignature: v }))}
                          />
                          <SignaturePad
                            label="Contractor Signature"
                            value={form.contractorSignature}
                            onChange={v => setForm(f => ({ ...f, contractorSignature: v }))}
                          />
                        </div>
                      </section>

                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-2 px-5 py-4 border-t border-border bg-muted/30">
                      {sendResult && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${sendResult.ok ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                          {sendResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <X className="h-3.5 w-3.5 flex-shrink-0" />}
                          {sendResult.msg}
                          <button type="button" onClick={() => setSendResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {editing && (
                          <button
                            type="button"
                            onClick={() => setPrintContract({ contract: editing, jobName: rows.find(r => r.contract.id === editing.id)?.jobName ?? null })}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Printer className="h-4 w-4" /> Print
                          </button>
                        )}
                        {editing && (
                          <button
                            type="button"
                            disabled={sending}
                            onClick={sendToClient}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
                          >
                            <Send className="h-4 w-4" />
                            {sending ? 'Sending…' : 'Send to Client'}
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity ml-auto"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Contract'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Show form button when list exists but no form open */}
              {!editing && rows.length > 0 && (
                <div className="w-full lg:w-[520px] flex-shrink-0">
                  <button
                    onClick={openNew}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-sm font-medium">New Contract</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-foreground mb-2">Delete Contract?</h3>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => deleteContract(deleteConfirm)} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
