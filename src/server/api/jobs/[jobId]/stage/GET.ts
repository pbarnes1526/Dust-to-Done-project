import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { projectStages } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const rows = await db.select().from(projectStages).where(eq(projectStages.jobId, jobId));
    res.json(rows[0] ?? null);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
