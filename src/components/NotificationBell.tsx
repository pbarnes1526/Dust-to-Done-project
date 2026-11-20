import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Truck, DollarSign, HardHat, Calendar } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  jobId?: number;
  read: number;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  upcoming_job: HardHat,
  schedule_change: Calendar,
  employee_assignment: HardHat,
  material_delivery: Truck,
  delayed_project: AlertTriangle,
  overdue_payment: DollarSign,
  inspection_deadline: AlertTriangle,
  job_ready: CheckCheck,
};

const TYPE_COLORS: Record<string, string> = {
  upcoming_job: 'text-blue-400',
  schedule_change: 'text-yellow-400',
  employee_assignment: 'text-purple-400',
  material_delivery: 'text-blue-400',
  delayed_project: 'text-orange-400',
  overdue_payment: 'text-red-400',
  inspection_deadline: 'text-orange-400',
  job_ready: 'text-green-400',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No notifications
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] ?? Bell;
                const color = TYPE_COLORS[n.type] ?? 'text-muted-foreground';
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/20 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
