import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface JobPhoto {
  id: number;
  url: string;
  category: string;
  description?: string;
  takenBy?: string;
  takenAt?: string;
  originalName?: string;
}

const CATEGORIES = [
  { value: 'before', label: 'Before Work' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'during', label: 'During Construction' },
  { value: 'installation', label: 'Installation' },
  { value: 'after', label: 'After Work' },
  { value: 'inspection', label: 'Final Inspection' },
];

const CAT_COLORS: Record<string, string> = {
  before: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  demolition: 'bg-red-500/15 text-red-400 border-red-500/30',
  during: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  installation: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  after: 'bg-green-500/15 text-green-400 border-green-500/30',
  inspection: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

interface Props { jobId: number; }

export default function JobPhotosPanel({ jobId }: Props) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [catFilter, setCatFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<JobPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'during', description: '', takenBy: '', takenAt: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/photos`)
      .then(r => r.json())
      .then(d => setPhotos(Array.isArray(d) ? d : []))
      .catch(() => setPhotos([]));
  }, [jobId]);

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('category', uploadForm.category);
    if (uploadForm.description) fd.append('description', uploadForm.description);
    if (uploadForm.takenBy) fd.append('takenBy', uploadForm.takenBy);
    if (uploadForm.takenAt) fd.append('takenAt', uploadForm.takenAt);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`, { method: 'POST', body: fd });
      const photo = await res.json();
      setPhotos(p => [...p, photo]);
    } catch { /* ignore */ }
    setUploading(false);
  }

  async function remove(id: number) {
    await fetch(`/api/jobs/${jobId}/photos/${id}`, { method: 'DELETE' });
    setPhotos(p => p.filter(ph => ph.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  }

  const filtered = catFilter === 'all' ? photos : photos.filter(p => p.category === catFilter);
  const beforePhotos = photos.filter(p => p.category === 'before');
  const afterPhotos = photos.filter(p => p.category === 'after');

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground">Job Photos</CardTitle>
          <div className="flex gap-2">
            {beforePhotos.length > 0 && afterPhotos.length > 0 && (
              <Button variant="outline" size="sm" className="border-border text-muted-foreground h-7 text-xs" onClick={() => setCompareMode(true)}>
                <ArrowLeftRight className="h-3 w-3 mr-1" /> Compare
              </Button>
            )}
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-3 w-3 mr-1" />{uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload options */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="bg-background border-border h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Taken by..." value={uploadForm.takenBy} onChange={e => setUploadForm(f => ({ ...f, takenBy: e.target.value }))} className="bg-background border-border h-8 text-xs" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setCatFilter('all')} className={`text-xs px-2 py-0.5 rounded border transition-colors ${catFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
            All ({photos.length})
          </button>
          {CATEGORIES.map(c => {
            const count = photos.filter(p => p.category === c.value).length;
            if (count === 0) return null;
            return (
              <button key={c.value} onClick={() => setCatFilter(c.value)} className={`text-xs px-2 py-0.5 rounded border transition-colors ${catFilter === c.value ? 'bg-primary text-primary-foreground border-primary' : `${CAT_COLORS[c.value]} hover:opacity-80`}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Photo grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No photos yet. Upload your first photo above.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(ph => (
              <div key={ph.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border cursor-pointer" onClick={() => setLightbox(ph)}>
                <img src={ph.url} alt={ph.description ?? ph.originalName ?? 'Job photo'} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none" />
                <Badge variant="outline" className={`absolute top-1 left-1 text-xs py-0 px-1 ${CAT_COLORS[ph.category] ?? ''}`}>
                  {CATEGORIES.find(c => c.value === ph.category)?.label.split(' ')[0]}
                </Badge>
                <button
                  className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                  onClick={e => { e.stopPropagation(); remove(ph.id); }}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="bg-card border-border max-w-3xl">
          {lightbox && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground text-sm">
                  {CATEGORIES.find(c => c.value === lightbox.category)?.label}
                  {lightbox.takenBy && <span className="text-muted-foreground font-normal ml-2">— {lightbox.takenBy}</span>}
                </DialogTitle>
              </DialogHeader>
              <img src={lightbox.url} alt={lightbox.description ?? ''} className="w-full max-h-[60vh] object-contain rounded-lg" />
              {lightbox.description && <p className="text-sm text-muted-foreground">{lightbox.description}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Before/After Compare */}
      <Dialog open={compareMode} onOpenChange={setCompareMode}>
        <DialogContent className="bg-card border-border max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Before & After Comparison</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Before Work</p>
              <div className="grid grid-cols-2 gap-1">
                {beforePhotos.map(p => <img key={p.id} src={p.url} alt="Before" className="w-full aspect-square object-cover rounded" loading="lazy" />)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">After Work</p>
              <div className="grid grid-cols-2 gap-1">
                {afterPhotos.map(p => <img key={p.id} src={p.url} alt="After" className="w-full aspect-square object-cover rounded" loading="lazy" />)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
