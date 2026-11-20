import { db } from '../db/client.js';
import { notifications } from '../db/schema.js';

type NotifType =
  | 'upcoming_job'
  | 'schedule_change'
  | 'employee_assignment'
  | 'material_delivery'
  | 'delayed_project'
  | 'overdue_payment'
  | 'inspection_deadline'
  | 'job_ready'
  | 'price_change'
  | 'price_refresh_failed'
  | 'price_unavailable';

export async function createNotification(
  type: NotifType,
  title: string,
  message: string,
  jobId?: number | null,
) {
  try {
    await db.insert(notifications).values({ type, title, message, jobId: jobId ?? null, read: 0 });
  } catch {
    // Non-fatal — notification failure should never break the main operation
  }
}
