import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { dailySchedules } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; schedId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.schedId);
    const { scheduleDate, startTime, endTime, tasks, materialsNeeded, specialInstructions, jobSiteNotes } = req.body;
    await db.update(dailySchedules).set({ scheduleDate, startTime, endTime, tasks, materialsNeeded, specialInstructions, jobSiteNotes }).where(eq(dailySchedules.id, id));
    const [row] = await db.select().from(dailySchedules).where(eq(dailySchedules.id, id));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
