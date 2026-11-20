import { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  id: number;
  item: string;
  completed: number;
  notes?: string;
}

const DEFAULT_ITEMS = [
  'All contracted work completed',
  'Materials and equipment removed',
  'Debris removed',
  'Work areas cleaned',
  'Fixtures tested',
  'Electrical work inspected where applicable',
  'Plumbing checked for leaks',
  'Doors and windows checked',
  'Paint and trim inspected',
  'Customer walkthrough completed',
  'Before-and-after photos saved',
  'Final invoice prepared',
  'Customer approval recorded',
];

interface Props { jobId: number; }

export default function JobChecklistPanel({ jobId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/checklist`)
      .then(r => r.json())
      .then(async (data: ChecklistItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        } else {
          // Seed default items
          const created: ChecklistItem[] = [];
          for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
            const res = await fetch(`/api/jobs/${jobId}/checklist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ item: DEFAULT_ITEMS[i], sortOrder: i }),
            });
            const row = await res.json();
            created.push(row);
          }
          setItems(created);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  async function toggle(item: ChecklistItem) {
    const updated = { ...item, completed: item.completed ? 0 : 1 };
    await fetch(`/api/jobs/${jobId}/checklist/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: updated.completed } : i));
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch(`/api/jobs/${jobId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem.trim(), sortOrder: items.length }),
    });
    const row = await res.json();
    setItems(prev => [...prev, row]);
    setNewItem('');
  }

  async function remove(id: number) {
    await fetch(`/api/jobs/${jobId}/checklist/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const completedCount = items.filter(i => i.completed).length;
  const pct = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
  const allDone = items.length > 0 && completedCount === items.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground">Completion Checklist</CardTitle>
          {allDone && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="h-4 w-4" /> All Complete
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{completedCount} of {items.length} complete</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 group py-1">
                <button onClick={() => toggle(item)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  {item.completed ? <CheckSquare className="h-4 w-4 text-green-400" /> : <Square className="h-4 w-4" />}
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.item}
                </span>
                <button onClick={() => remove(item.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add item */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add checklist item..."
            className="bg-background border-border h-8 text-sm"
          />
          <Button size="sm" variant="outline" className="border-border h-8 shrink-0" onClick={addItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
