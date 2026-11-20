import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import {
  jobs, expenses, invoices, estimates, documents,
  jobAssignments, projectStages, jobPhotos, completionChecklist,
  dailySchedules, calendarEvents, materialOrders, notifications,
} from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const id = Number(req.params.jobId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    // Null out jobId on records with nullable FK columns (preserve financial records)
    await db.update(expenses).set({ jobId: null }).where(eq(expenses.jobId, id));
    await db.update(invoices).set({ jobId: null }).where(eq(invoices.jobId, id));
    await db.update(estimates).set({ jobId: null }).where(eq(estimates.jobId, id));
    await db.update(materialOrders).set({ jobId: null }).where(eq(materialOrders.jobId, id));
    await db.update(notifications).set({ jobId: null }).where(eq(notifications.jobId, id));
    await db.update(calendarEvents).set({ jobId: null }).where(eq(calendarEvents.jobId, id));

    // Delete records with NOT NULL FK columns (job-specific data)
    await db.delete(documents).where(eq(documents.jobId, id));
    await db.delete(jobAssignments).where(eq(jobAssignments.jobId, id));
    await db.delete(projectStages).where(eq(projectStages.jobId, id));
    await db.delete(jobPhotos).where(eq(jobPhotos.jobId, id));
    await db.delete(completionChecklist).where(eq(completionChecklist.jobId, id));
    await db.delete(dailySchedules).where(eq(dailySchedules.jobId, id));

    // Delete the job itself
    await db.delete(jobs).where(eq(jobs.id, id));

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete job', message: String(error) });
  }
}
