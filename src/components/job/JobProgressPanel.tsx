import { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STAGES = [
  { value: 'not_started', label: 'Not Started', pct: 0 },
  { value: 'scheduled', label: 'Scheduled', pct: 5 },
  { value: 'preparation', label: 'Preparation', pct: 10 },
  { value: 'demolition', label: 'Demolition', pct: 20 },
  { value: 'framing', label: 'Framing', pct: 30 },
  { value: 'rough_in', label: 'Rough-In', pct: 40 },
  { value: 'insulation', label: 'Insulation', pct: 50 },
  { value: 'drywall', label: 'Drywall', pct: 60 },
  { value: 'flooring', label: 'Flooring', pct: 70 },
  { value: 'cabinet_installation', label: 'Cabinet Installation', pct: 75 },
  { value: 'painting', label: 'Painting', pct: 82 },
  { value: 'finishing', label: 'Finishing', pct: 90 },
  { value: 'final_inspection', label: 'Final Inspection', pct: 95 },
  { value: 'completed', label: 'Completed', pct: 100 },
];

interface StageData {
  id?: number;
  stage: string;
  progressPct: number;
  notes?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
}

interface Props { jobId: number; }

export default function JobProgressPanel({ jobId }: Props) {
  const [data, setData] = useState<StageData>({ stage: 'not_started', progressPct: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/stage`)
      .then(r => r.json())
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, [jobId]);

  function handleStageChange(stage: string) {
    const found = STAGES.find(s => s.value === stage);
    setData(d => ({ ...d, stage, progressPct: found?.pct ?? d.progressPct }));
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/jobs/${jobId}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const currentStageIdx = STAGES.findIndex(s => s.value === data.stage);
  const pct = data.progressPct;
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 75 ? 'bg-primary' : pct >= 40 ? 'bg-blue-500' : 'bg-yellow-500';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">{STAGES.find(s => s.value === data.stage)?.label ?? data.stage}</span>
            <span className="text-sm font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Stage steps */}
        <div className="flex flex-wrap gap-1">
          {STAGES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => handleStageChange(s.value)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                s.value === data.stage
                  ? 'bg-primary text-primary-foreground border-primary'
                  : i < currentStageIdx
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Manual progress override */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Progress %</Label>
            <Input
              type="number" min={0} max={100}
              value={data.progressPct}
              onChange={e => setData(d => ({ ...d, progressPct: parseInt(e.target.value) || 0 }))}
              className="bg-background border-border h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Expected Completion</Label>
            <Input
              type="date"
              value={data.expectedCompletionDate ?? ''}
              onChange={e => setData(d => ({ ...d, expectedCompletionDate: e.target.value }))}
              className="bg-background border-border h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Progress Notes</Label>
          <Textarea
            value={data.notes ?? ''}
            onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
            className="bg-background border-border text-sm"
            rows={2}
            placeholder="Delays, issues, milestones..."
          />
        </div>

        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          onClick={save}
          disabled={saving}
        >
          {saved ? <><CheckCircle className="h-4 w-4 mr-2" />Saved!</> : <><Save className="h-4 w-4 mr-2" />Save Progress</>}
        </Button>
      </CardContent>
    </Card>
  );
}
