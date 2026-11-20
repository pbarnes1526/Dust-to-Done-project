import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { projectStages } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const { stage, progressPct, notes, expectedCompletionDate, actualCompletionDate } = req.body;
    const existing = await db.select().from(projectStages).where(eq(projectStages.jobId, jobId));
    if (existing.length > 0) {
      await db.update(projectStages).set({ stage, progressPct, notes, expectedCompletionDate, actualCompletionDate }).where(eq(projectStages.jobId, jobId));
    } else {
      await db.insert(projectStages).values({ jobId, stage, progressPct: progressPct ?? 0, notes, expectedCompletionDate, actualCompletionDate });
    }
    const [row] = await db.select().from(projectStages).where(eq(projectStages.jobId, jobId));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
