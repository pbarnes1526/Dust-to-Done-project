import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { completionChecklist } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; itemId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.itemId);
    const { item, completed, notes, photoUrl, sortOrder } = req.body;
    const completedAt = completed ? new Date() : null;
    await db.update(completionChecklist).set({ item, completed: completed ? 1 : 0, completedAt, notes, photoUrl, sortOrder }).where(eq(completionChecklist.id, id));
    const [row] = await db.select().from(completionChecklist).where(eq(completionChecklist.id, id));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
