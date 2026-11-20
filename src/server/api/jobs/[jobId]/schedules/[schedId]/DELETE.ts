import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { dailySchedules } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; schedId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.schedId);
    await db.delete(dailySchedules).where(eq(dailySchedules.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
