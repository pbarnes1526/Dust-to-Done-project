import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { completionChecklist } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; itemId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.itemId);
    await db.delete(completionChecklist).where(eq(completionChecklist.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
