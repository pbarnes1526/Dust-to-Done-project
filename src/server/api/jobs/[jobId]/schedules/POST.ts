import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { dailySchedules } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const { scheduleDate, startTime, endTime, tasks, materialsNeeded, specialInstructions, jobSiteNotes } = req.body;
    if (!scheduleDate) return res.status(400).json({ error: 'scheduleDate required' });
    const [result] = await db.insert(dailySchedules).values({ jobId, scheduleDate, startTime, endTime, tasks, materialsNeeded, specialInstructions, jobSiteNotes });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(dailySchedules).where(eq(dailySchedules.id, id));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
