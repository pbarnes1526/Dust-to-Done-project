import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Save, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DailySchedule {
  id: number;
  jobId: number;
  scheduleDate: string;
  startTime?: string;
  endTime?: string;
  tasks?: string;
  materialsNeeded?: string;
  specialInstructions?: string;
  jobSiteNotes?: string;
}

interface Props { jobId: number; jobName?: string; clientName?: string; address?: string; }

export default function JobSchedulesPanel({ jobId, jobName, clientName, address }: Props) {
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DailySchedule | null>(null);
  const [printSchedule, setPrintSchedule] = useState<DailySchedule | null>(null);
  const [form, setForm] = useState({ scheduleDate: '', startTime: '', endTime: '', tasks: '', materialsNeeded: '', specialInstructions: '', jobSiteNotes: '' });

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/schedules`)
      .then(r => r.json())
      .then(d => setSchedules(Array.isArray(d) ? d : []))
      .catch(() => setSchedules([]));
  }, [jobId]);

  function openCreate() {
    setEditing(null);
    setForm({ scheduleDate: new Date().toISOString().split('T')[0], startTime: '07:00', endTime: '17:00', tasks: '', materialsNeeded: '', specialInstructions: '', jobSiteNotes: '' });
    setShowModal(true);
  }

  function openEdit(s: DailySchedule) {
    setEditing(s);
    setForm({ scheduleDate: s.scheduleDate, startTime: s.startTime ?? '', endTime: s.endTime ?? '', tasks: s.tasks ?? '', materialsNeeded: s.materialsNeeded ?? '', specialInstructions: s.specialInstructions ?? '', jobSiteNotes: s.jobSiteNotes ?? '' });
    setShowModal(true);
  }

  async function save() {
    if (editing) {
      const res = await fetch(`/api/jobs/${jobId}/schedules/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const row = await res.json();
      setSchedules(prev => prev.map(s => s.id === editing.id ? row : s));
    } else {
      const res = await fetch(`/api/jobs/${jobId}/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const row = await res.json();
      setSchedules(prev => [...prev, row]);
    }
    setShowModal(false);
  }

  async function remove(id: number) {
    await fetch(`/api/jobs/${jobId}/schedules/${id}`, { method: 'DELETE' });
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  function printDay(s: DailySchedule) {
    setPrintSchedule(s);
    setTimeout(() => window.print(), 300);
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-foreground">Daily Work Schedules</CardTitle>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs" onClick={openCreate}>
              <Plus className="h-3 w-3 mr-1" /> Add Day
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No daily schedules yet.</p>
          ) : (
            schedules.sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate)).map(s => (
              <div key={s.id} className="p-3 bg-muted/20 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openEdit(s)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">{s.scheduleDate}</span>
                    {s.startTime && <span className="text-xs text-muted-foreground">{s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}</span>}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => printDay(s)}>
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {s.tasks && <p className="text-xs text-muted-foreground truncate">{s.tasks}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Edit Daily Schedule' : 'Add Daily Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date *</Label>
                <Input type="date" value={form.scheduleDate} onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))} className="bg-background border-border h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="bg-background border-border h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="bg-background border-border h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tasks for the Day</Label>
              <Textarea value={form.tasks} onChange={e => setForm(f => ({ ...f, tasks: e.target.value }))} className="bg-background border-border text-sm" rows={3} placeholder="List tasks scheduled for this day..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Materials Needed</Label>
              <Textarea value={form.materialsNeeded} onChange={e => setForm(f => ({ ...f, materialsNeeded: e.target.value }))} className="bg-background border-border text-sm" rows={2} placeholder="Materials to bring or order..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Special Instructions</Label>
              <Textarea value={form.specialInstructions} onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))} className="bg-background border-border text-sm" rows={2} placeholder="Access codes, parking, special requirements..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Job-Site Notes</Label>
              <Textarea value={form.jobSiteNotes} onChange={e => setForm(f => ({ ...f, jobSiteNotes: e.target.value }))} className="bg-background border-border text-sm" rows={2} placeholder="On-site conditions, hazards, notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!form.scheduleDate}>
                <Save className="h-4 w-4 mr-2" />{editing ? 'Save Changes' : 'Add Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print view */}
      {printSchedule && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[9999]">
          <h1 className="text-2xl font-bold mb-1">{jobName ?? 'Job'} — Daily Work Schedule</h1>
          <p className="text-gray-600 mb-4">{clientName} | {address}</p>
          <div className="border-t-2 border-black pt-4 space-y-3">
            <div className="flex gap-8">
              <div><strong>Date:</strong> {printSchedule.scheduleDate}</div>
              {printSchedule.startTime && <div><strong>Start:</strong> {printSchedule.startTime}</div>}
              {printSchedule.endTime && <div><strong>End:</strong> {printSchedule.endTime}</div>}
            </div>
            {printSchedule.tasks && <div><strong>Tasks:</strong><p className="mt-1 whitespace-pre-wrap">{printSchedule.tasks}</p></div>}
            {printSchedule.materialsNeeded && <div><strong>Materials Needed:</strong><p className="mt-1 whitespace-pre-wrap">{printSchedule.materialsNeeded}</p></div>}
            {printSchedule.specialInstructions && <div><strong>Special Instructions:</strong><p className="mt-1 whitespace-pre-wrap">{printSchedule.specialInstructions}</p></div>}
            {printSchedule.jobSiteNotes && <div><strong>Job-Site Notes:</strong><p className="mt-1 whitespace-pre-wrap">{printSchedule.jobSiteNotes}</p></div>}
          </div>
        </div>
      )}
    </>
  );
}
