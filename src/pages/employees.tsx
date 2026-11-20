import { employees as employeesContent } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';

import {
  Users, Plus, Search, Phone, Mail, Briefcase,
  Edit2, Trash2, UserCheck, X, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Employee {
  id: number;
  name: string;
  type: 'employee' | 'subcontractor';
  phone?: string;
  email?: string;
  specialty?: string;
  hourlyRate?: string;
  notes?: string;
  availability?: string;
  isActive: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'employee' | 'subcontractor'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', type: 'employee', phone: '', email: '',
    specialty: '', hourlyRate: '', notes: '', availability: '',
  });

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', type: 'employee', phone: '', email: '', specialty: '', hourlyRate: '', notes: '', availability: '' });
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name, type: emp.type, phone: emp.phone ?? '',
      email: emp.email ?? '', specialty: emp.specialty ?? '',
      hourlyRate: emp.hourlyRate ?? '', notes: emp.notes ?? '',
      availability: emp.availability ?? '',
    });
    setShowModal(true);
  }

  async function save() {
    const body = { ...form, hourlyRate: form.hourlyRate || null };
    if (editing) {
      await fetch(`/api/employees/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    fetchEmployees();
  }

  async function remove(id: number) {
    if (!confirm('Delete this person?')) return;
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    fetchEmployees();
  }

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.specialty ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const empCount = employees.filter(e => e.type === 'employee' && e.isActive).length;
  const subCount = employees.filter(e => e.type === 'subcontractor' && e.isActive).length;

  return (
    <>
      <Helmet>
        <title>Employees & Subcontractors — Dust to Done</title>
        <meta name="description" content="Manage your crew, subcontractors, and labor assignments." />
      </Helmet>

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[Barlow]">Employees & Subcontractors</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your crew and assigned labor</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Add Person
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: empCount, icon: UserCheck, color: 'text-blue-400' },
            { label: 'Subcontractors', value: subCount, icon: Briefcase, color: 'text-purple-400' },
            { label: 'Total Active', value: empCount + subCount, icon: Users, color: 'text-primary' },
            { label: 'Inactive', value: employees.filter(e => !e.isActive).length, icon: X, color: 'text-muted-foreground' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or specialty..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
          </div>
          <div className="flex gap-2">
            {(['all', 'employee', 'subcontractor'] as const).map(t => (
              <Button key={t} variant={typeFilter === t ? 'default' : 'outline'} size="sm"
                className={typeFilter === t ? 'bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}
                onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All' : t === 'employee' ? 'Employees' : 'Subcontractors'}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No people found. Add your first employee or subcontractor.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Specialty</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Contact</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rate</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={emp.type === 'employee' ? 'border-blue-500/40 text-blue-400' : 'border-purple-500/40 text-purple-400'}>
                          {emp.type === 'employee' ? 'Employee' : 'Subcontractor'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.specialty ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {emp.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{emp.phone}</div>}
                          {emp.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{emp.email}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {emp.hourlyRate ? `$${parseFloat(emp.hourlyRate).toFixed(2)}/hr` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={emp.isActive ? 'border-green-500/40 text-green-400' : 'border-muted text-muted-foreground'}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(emp)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(emp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Edit Person' : 'Add Employee / Subcontractor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border" placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Specialty</Label>
                <Select value={form.specialty} onValueChange={v => setForm(f => ({ ...f, specialty: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(employeesContent.SPECIALTIES as string[]).map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Hourly Rate ($)</Label>
                <Input type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} className="bg-background border-border" placeholder="65.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Availability / Schedule Notes</Label>
              <Input value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))} className="bg-background border-border" placeholder="e.g. Mon–Fri, available weekends" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-background border-border" rows={3} placeholder="Skills, certifications, notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!form.name}>
                <Save className="h-4 w-4 mr-2" />{editing ? 'Save Changes' : 'Add Person'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
