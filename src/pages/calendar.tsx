import { calendar } from 'virtual:content';
import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';

import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  HardHat, Truck, User, AlertTriangle, X, Save, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CalEvent {
  id: number;
  jobId?: number;
  title: string;
  type: string;
  eventDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  assignedEmployeeId?: number;
}

interface Job { id: number; name: string; clientName: string; }
interface Employee { id: number; name: string; }

const EVENT_COLORS: Record<string, string> = {
  job_start: 'bg-green-500/20 text-green-400 border-green-500/30',
  job_end: 'bg-red-500/20 text-red-400 border-red-500/30',
  delivery: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  appointment: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  inspection: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  deadline: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-muted text-muted-foreground border-border',
};

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  job_start: HardHat,
  job_end: HardHat,
  delivery: Truck,
  appointment: User,
  inspection: AlertTriangle,
  deadline: Clock,
  other: Calendar,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [form, setForm] = useState({ title: '', type: 'other', eventDate: '', endDate: '', startTime: '', endTime: '', description: '', jobId: '', assignedEmployeeId: '' });

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d.map((row: { event: CalEvent }) => row.event) : [])).catch(() => setEvents([]));
    fetch('/api/jobs').then(r => r.json()).then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => setJobs([]));
    fetch('/api/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : [])).catch(() => setEmployees([]));
  }, []);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  function openCreate(date?: string) {
    setEditing(null);
    setForm({ title: '', type: 'other', eventDate: date ?? '', endDate: '', startTime: '', endTime: '', description: '', jobId: '', assignedEmployeeId: '' });
    setShowModal(true);
  }

  function openEdit(ev: CalEvent) {
    setEditing(ev);
    setForm({ title: ev.title, type: ev.type, eventDate: ev.eventDate, endDate: ev.endDate ?? '', startTime: ev.startTime ?? '', endTime: ev.endTime ?? '', description: ev.description ?? '', jobId: ev.jobId ? String(ev.jobId) : '', assignedEmployeeId: ev.assignedEmployeeId ? String(ev.assignedEmployeeId) : '' });
    setShowModal(true);
  }

  async function save() {
    const body = { ...form, jobId: form.jobId ? parseInt(form.jobId) : null, assignedEmployeeId: form.assignedEmployeeId ? parseInt(form.assignedEmployeeId) : null };
    if (editing) {
      await fetch(`/api/calendar/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    const res = await fetch('/api/calendar');
    const d = await res.json();
    setEvents(Array.isArray(d) ? d.map((row: { event: CalEvent }) => row.event) : []);
  }

  async function remove(id: number) {
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    setEvents(ev => ev.filter(e => e.id !== id));
  }

  function eventsForDate(dateStr: string) {
    return events.filter(e => e.eventDate === dateStr || (e.endDate && e.eventDate <= dateStr && e.endDate >= dateStr));
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <Helmet>
        <title>Job Calendar — Dust to Done</title>
        <meta name="description" content="Schedule and track all job events, deliveries, and appointments." />
      </Helmet>

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[Barlow]">Job Calendar</h1>
            <p className="text-muted-foreground text-sm mt-1">Schedule jobs, deliveries, and appointments</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map(v => (
                <Button key={v} size="sm" variant={view === v ? 'default' : 'ghost'}
                  className={view === v ? 'bg-primary text-primary-foreground h-7' : 'h-7 text-muted-foreground'}
                  onClick={() => setView(v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </div>
            <Button onClick={() => openCreate()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Add Event
            </Button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="border-border" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-xl font-semibold text-foreground min-w-[200px] text-center">{MONTHS[month]} {year}</h2>
          <Button variant="outline" size="icon" className="border-border" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</Button>
        </div>

        {/* Calendar Grid */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {calendar.DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const dayEvents = day ? eventsForDate(dateStr) : [];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1.5 border-r border-b border-border last:border-r-0 ${day ? 'cursor-pointer hover:bg-muted/20' : 'bg-muted/10'} transition-colors`}
                  onClick={() => day && openCreate(dateStr)}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => {
                          const Icon = EVENT_ICONS[ev.type] ?? Calendar;
                          return (
                            <div
                              key={ev.id}
                              className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 truncate ${EVENT_COLORS[ev.type] ?? EVENT_COLORS.other}`}
                              onClick={e => { e.stopPropagation(); openEdit(ev); }}
                            >
                              <Icon className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming events list */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Upcoming Events</h3>
          <div className="space-y-2">
            {events
              .filter(e => e.eventDate >= today.toISOString().split('T')[0])
              .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
              .slice(0, 10)
              .map(ev => {
                const Icon = EVENT_ICONS[ev.type] ?? Calendar;
                const job = jobs.find(j => j.id === ev.jobId);
                return (
                  <Card key={ev.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openEdit(ev)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${EVENT_COLORS[ev.type] ?? EVENT_COLORS.other}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{ev.title}</p>
                        {job && <p className="text-xs text-muted-foreground">{job.name} — {job.clientName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-foreground">{ev.eventDate}</p>
                        {ev.startTime && <p className="text-xs text-muted-foreground">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); remove(ev.id); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            {events.filter(e => e.eventDate >= today.toISOString().split('T')[0]).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">No upcoming events. Click a date on the calendar to add one.</p>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Edit Event' : 'Add Calendar Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-background border-border" placeholder="Event title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="job_start">Job Start</SelectItem>
                    <SelectItem value="job_end">Job End</SelectItem>
                    <SelectItem value="delivery">Material Delivery</SelectItem>
                    <SelectItem value="appointment">Customer Appointment</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Job (optional)</Label>
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
                <Label className="text-muted-foreground">Date *</Label>
                <Input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Assigned Employee</Label>
              <Select value={form.assignedEmployeeId || 'none'} onValueChange={v => setForm(f => ({ ...f, assignedEmployeeId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select person..." /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background border-border" rows={2} />
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <div>
                {editing && (
                  <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => { remove(editing.id); setShowModal(false); }}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete Event
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!form.title || !form.eventDate}>
                  <Save className="h-4 w-4 mr-2" />{editing ? 'Save Changes' : 'Add Event'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
