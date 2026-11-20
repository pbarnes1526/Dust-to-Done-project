import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { completionChecklist } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const { item, notes, sortOrder } = req.body;
    if (!item) return res.status(400).json({ error: 'item required' });
    const [result] = await db.insert(completionChecklist).values({ jobId, item, notes, sortOrder: sortOrder ?? 0 });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(completionChecklist).where(eq(completionChecklist.id, id));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
