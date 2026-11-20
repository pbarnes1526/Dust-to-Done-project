import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { jobAssignments } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; assignId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.assignId);
    await db.delete(jobAssignments).where(eq(jobAssignments.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
