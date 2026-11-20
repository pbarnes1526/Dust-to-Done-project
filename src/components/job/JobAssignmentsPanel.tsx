import { useState, useEffect } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Employee { id: number; name: string; type: string; specialty?: string; hourlyRate?: string; isActive?: number; }
interface Assignment {
  assignment: { id: number; jobId: number; employeeId: number; role?: string; scheduledHours?: string; actualHours?: string; startDate?: string; endDate?: string; };
  employee: Employee | null;
}

interface Props { jobId: number; }

export default function JobAssignmentsPanel({ jobId }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState('');
  const [role, setRole] = useState('');
  const [scheduledHours, setScheduledHours] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/assignments`).then(r => r.json()).then(d => setAssignments(Array.isArray(d) ? d : [])).catch(() => setAssignments([]));
    fetch('/api/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : [])).catch(() => setEmployees([]));
  }, [jobId]);

  const assignedIds = assignments.map(a => a.assignment.employeeId);
  const available = employees.filter(e => !assignedIds.includes(e.id) && e.isActive);

  async function assign() {
    if (!empId) return;
    const res = await fetch(`/api/jobs/${jobId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: parseInt(empId), role, scheduledHours: scheduledHours || null }),
    });
    const row = await res.json();
    const emp = employees.find(e => e.id === parseInt(empId)) ?? null;
    setAssignments(prev => [...prev, { assignment: row, employee: emp }]);
    setEmpId(''); setRole(''); setScheduledHours('');
  }

  async function remove(id: number) {
    await fetch(`/api/jobs/${jobId}/assignments/${id}`, { method: 'DELETE' });
    setAssignments(prev => prev.filter(a => a.assignment.id !== id));
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">Assigned Workers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No workers assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.assignment.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {(a.employee?.name ?? '?').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.employee?.name ?? 'Unknown'}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-xs py-0 px-1 ${a.employee?.type === 'employee' ? 'border-blue-500/30 text-blue-400' : 'border-purple-500/30 text-purple-400'}`}>
                        {a.employee?.type === 'employee' ? 'Employee' : 'Sub'}
                      </Badge>
                      {a.assignment.role && <span className="text-xs text-muted-foreground">{a.assignment.role}</span>}
                      {a.assignment.scheduledHours && <span className="text-xs text-muted-foreground">{a.assignment.scheduledHours}h scheduled</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(a.assignment.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add assignment */}
        {available.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground">Assign worker</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger className="bg-background border-border h-8 text-xs"><SelectValue placeholder="Select person..." /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {available.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.name} ({e.type === 'employee' ? 'Emp' : 'Sub'})</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} className="bg-background border-border h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Scheduled hours" value={scheduledHours} onChange={e => setScheduledHours(e.target.value)} className="bg-background border-border h-8 text-xs" />
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shrink-0" onClick={assign} disabled={!empId}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
