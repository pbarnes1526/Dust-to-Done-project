import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { jobs } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const id = Number(req.params.jobId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, clientName, clientEmail, clientPhone, address, status, budget, startDate, endDate, notes, scopeNotes } = req.body;
    await db.update(jobs).set({ name, clientName, clientEmail, clientPhone, address, status, budget, startDate, endDate, notes, scopeNotes }).where(eq(jobs.id, id));
    const [updated] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!updated) return res.status(404).json({ error: 'Job not found' });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update job', message: String(error) });
  }
}
