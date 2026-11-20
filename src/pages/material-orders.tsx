import { material_orders } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  Package, Plus, Search, ExternalLink, Edit2, Trash2,
  AlertTriangle, CheckCircle, Clock, Truck, Save, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MaterialOrder {
  id: number;
  jobId?: number;
  description: string;
  quantity: string;
  unit: string;
  supplier?: string;
  productLink?: string;
  unitPrice?: string;
  totalCost?: string;
  status: string;
  orderDate?: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
}

interface Job { id: number; name: string; clientName: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  needed: { label: 'Needed', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  price_checking: { label: 'Price Checking', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Search },
  ready_to_order: { label: 'Ready to Order', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Package },
  ordered: { label: 'Ordered', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Truck },
  partially_received: { label: 'Partial', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: Package },
  received: { label: 'Received', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle },
  returned: { label: 'Returned', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: X },
  backordered: { label: 'Backordered', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertTriangle },
};

const STATUS_ORDER = ['needed', 'price_checking', 'ready_to_order', 'ordered', 'partially_received', 'received', 'returned', 'backordered'];

export default function MaterialOrdersPage() {
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    jobId: '', description: '', quantity: '1', unit: 'ea',
    supplier: '', productLink: '', unitPrice: '', totalCost: '',
    status: 'needed', orderDate: '', expectedDelivery: '', actualDelivery: '', notes: '',
  });

  useEffect(() => {
    fetchOrders();
    fetch('/api/jobs').then(r => r.json()).then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => setJobs([]));
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/material-orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data.map((row: { order: MaterialOrder } | MaterialOrder) => ('order' in row ? row.order : row)) : []);
    } catch { setOrders([]); }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ jobId: '', description: '', quantity: '1', unit: 'ea', supplier: '', productLink: '', unitPrice: '', totalCost: '', status: 'needed', orderDate: '', expectedDelivery: '', actualDelivery: '', notes: '' });
    setShowModal(true);
  }

  function openEdit(o: MaterialOrder) {
    setEditing(o);
    setForm({ jobId: o.jobId ? String(o.jobId) : '', description: o.description, quantity: o.quantity, unit: o.unit, supplier: o.supplier ?? '', productLink: o.productLink ?? '', unitPrice: o.unitPrice ?? '', totalCost: o.totalCost ?? '', status: o.status, orderDate: o.orderDate ?? '', expectedDelivery: o.expectedDelivery ?? '', actualDelivery: o.actualDelivery ?? '', notes: o.notes ?? '' });
    setShowModal(true);
  }

  async function save() {
    const body = { ...form, jobId: form.jobId ? parseInt(form.jobId) : null, quantity: parseFloat(form.quantity) || 1, unitPrice: form.unitPrice || null, totalCost: form.totalCost || null };
    if (editing) {
      await fetch(`/api/material-orders/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/material-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    fetchOrders();
  }

  async function remove(id: number) {
    if (!confirm('Delete this order?')) return;
    await fetch(`/api/material-orders/${id}`, { method: 'DELETE' });
    fetchOrders();
  }

  async function cycleStatus(o: MaterialOrder) {
    const idx = STATUS_ORDER.indexOf(o.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    await fetch(`/api/material-orders/${o.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...o, status: next }) });
    fetchOrders();
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.description.toLowerCase().includes(search.toLowerCase()) || (o.supplier ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const outstanding = orders.filter(o => !['received', 'returned'].includes(o.status)).length;
  const backordered = orders.filter(o => o.status === 'backordered').length;
  const ordered = orders.filter(o => o.status === 'ordered').length;
  const received = orders.filter(o => o.status === 'received').length;

  return (
    <>
      <Helmet>
        <title>{material_orders.title} — Dust to Done</title>
        <meta name="description" content={material_orders.description} />
      </Helmet>

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[Barlow]">{material_orders.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{material_orders.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> <span>{material_orders.addButton}</span>
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Outstanding', value: outstanding, color: 'text-yellow-400' },
            { label: 'Ordered', value: ordered, color: 'text-purple-400' },
            { label: 'Backordered', value: backordered, color: 'text-red-400' },
            { label: 'Received', value: received, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search materials or supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-card border-border"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No material orders yet. Add your first order.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Description</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Job</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Qty</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cost</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Expected</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => {
                    const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.needed;
                    const job = jobs.find(j => j.id === o.jobId);
                    return (
                      <tr key={o.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{o.description}</div>
                          {o.productLink && (
                            <a href={o.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" /> Product link
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{job ? job.name : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.quantity} {o.unit}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.supplier ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {o.totalCost ? `$${parseFloat(o.totalCost).toFixed(2)}` : o.unitPrice ? `$${parseFloat(o.unitPrice).toFixed(2)}/ea` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{o.expectedDelivery ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => cycleStatus(o)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${cfg.color}`}>
                            <cfg.icon className="h-3 w-3" />{cfg.label}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(o)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(o.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Edit Material Order' : 'Add Material Order'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background border-border" placeholder="Material description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Quantity</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Unit</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="bg-background border-border" placeholder="ea, lf, sf..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Supplier</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="bg-background border-border" placeholder="Supplier name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Job</Label>
                <Select value={form.jobId || 'none'} onValueChange={v => setForm(f => ({ ...f, jobId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select job..." /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">None</SelectItem>
                    {jobs.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Unit Price ($)</Label>
                <Input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="bg-background border-border" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Total Cost ($)</Label>
                <Input type="number" value={form.totalCost} onChange={e => setForm(f => ({ ...f, totalCost: e.target.value }))} className="bg-background border-border" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Product Link</Label>
              <Input value={form.productLink} onChange={e => setForm(f => ({ ...f, productLink: e.target.value }))} className="bg-background border-border" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Order Date</Label>
                <Input type="date" value={form.orderDate} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Expected Delivery</Label>
                <Input type="date" value={form.expectedDelivery} onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Actual Delivery</Label>
                <Input type="date" value={form.actualDelivery} onChange={e => setForm(f => ({ ...f, actualDelivery: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!form.description}>
                <Save className="h-4 w-4 mr-2" />{editing ? 'Save Changes' : 'Add Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
