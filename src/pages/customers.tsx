import { customers as customersContent } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router';
import {
  Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2,
  ChevronRight, FileText, Receipt, HardHat, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  warrantyInfo?: string;
}

interface CustomerDetail extends Customer {
  jobs: { id: number; name: string; status: string; }[];
  estimates: { id: number; estimateNumber: string; status: string; total: string; }[];
  invoices: { id: number; invoiceNumber: string; status: string; total: string; }[];
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '', warrantyInfo: '' });

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch { setCustomers([]); }
    setLoading(false);
  }

  async function openDetail(c: Customer) {
    try {
      const res = await fetch(`/api/customers/${c.id}`);
      const data = await res.json();
      setDetail(data);
      setShowDetail(true);
    } catch { /* ignore */ }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', address: '', notes: '', warrantyInfo: '' });
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '', warrantyInfo: c.warrantyInfo ?? '' });
    setShowModal(true);
  }

  async function save() {
    if (editing) {
      await fetch(`/api/customers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setShowModal(false);
    fetchCustomers();
  }

  async function remove(id: number) {
    if (!confirm('Delete this customer?')) return;
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    fetchCustomers();
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  return (
    <>
      <Helmet>
        <title>{customersContent.title} — Dust to Done</title>
        <meta name="description" content={customersContent.description} />
      </Helmet>

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[Barlow]">{customersContent.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{customersContent.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> <span>{customersContent.addButton}</span>
            </Button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{customers.filter(c => c.email).length}</p>
                <p className="text-xs text-muted-foreground">With Email</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Phone className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{customers.filter(c => c.phone).length}</p>
                <p className="text-xs text-muted-foreground">With Phone</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>

        {/* Customer Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No customers yet. Add your first customer.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openDetail(c)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                    {c.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{c.address}</span></div>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">View project history</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border" placeholder="Customer name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-background border-border" placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Warranty Info</Label>
              <Textarea value={form.warrantyInfo} onChange={e => setForm(f => ({ ...f, warrantyInfo: e.target.value }))} className="bg-background border-border" rows={2} placeholder="Warranty terms, expiration dates..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={2} placeholder="Customer notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!form.name}>
                <Save className="h-4 w-4 mr-2" />{editing ? 'Save Changes' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <Tabs defaultValue="jobs" className="mt-2">
              <TabsList className="bg-muted">
                <TabsTrigger value="jobs" className="data-[state=active]:bg-card">Jobs ({detail.jobs?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="estimates" className="data-[state=active]:bg-card">Estimates ({detail.estimates?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="invoices" className="data-[state=active]:bg-card">Invoices ({detail.invoices?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="info" className="data-[state=active]:bg-card">Info</TabsTrigger>
              </TabsList>
              <TabsContent value="jobs" className="mt-4 space-y-2">
                {(detail.jobs ?? []).length === 0 ? <p className="text-muted-foreground text-sm">No jobs found for this customer.</p> : (detail.jobs ?? []).map(j => (
                  <div key={j.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border cursor-pointer hover:border-primary/30" onClick={() => { setShowDetail(false); navigate(`/jobs/${j.id}`); }}>
                    <div className="flex items-center gap-2"><HardHat className="h-4 w-4 text-muted-foreground" /><span className="text-foreground text-sm">{j.name}</span></div>
                    <Badge variant="outline" className="text-xs">{j.status}</Badge>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="estimates" className="mt-4 space-y-2">
                {(detail.estimates ?? []).length === 0 ? <p className="text-muted-foreground text-sm">No estimates found.</p> : (detail.estimates ?? []).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border cursor-pointer hover:border-primary/30" onClick={() => { setShowDetail(false); navigate(`/estimates/${e.id}`); }}>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-foreground text-sm">{e.estimateNumber}</span></div>
                    <div className="flex items-center gap-3"><Badge variant="outline" className="text-xs">{e.status}</Badge><span className="text-sm text-foreground">${parseFloat(e.total).toFixed(2)}</span></div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="invoices" className="mt-4 space-y-2">
                {(detail.invoices ?? []).length === 0 ? <p className="text-muted-foreground text-sm">No invoices found.</p> : (detail.invoices ?? []).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border cursor-pointer hover:border-primary/30" onClick={() => { setShowDetail(false); navigate(`/invoices/${inv.id}`); }}>
                    <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /><span className="text-foreground text-sm">{inv.invoiceNumber}</span></div>
                    <div className="flex items-center gap-3"><Badge variant="outline" className="text-xs">{inv.status}</Badge><span className="text-sm text-foreground">${parseFloat(inv.total).toFixed(2)}</span></div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="info" className="mt-4 space-y-3">
                {detail.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{detail.phone}</span></div>}
                {detail.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{detail.email}</span></div>}
                {detail.address && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{detail.address}</span></div>}
                {detail.warrantyInfo && <div className="mt-3"><p className="text-xs text-muted-foreground mb-1">Warranty Info</p><p className="text-sm text-foreground bg-muted/20 rounded p-2">{detail.warrantyInfo}</p></div>}
                {detail.notes && <div className="mt-3"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground bg-muted/20 rounded p-2">{detail.notes}</p></div>}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
