import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { jobMaterials } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ error: 'Invalid jobId' });
    const items = await db
      .select()
      .from(jobMaterials)
      .where(eq(jobMaterials.jobId, jobId))
      .orderBy(asc(jobMaterials.createdAt));
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch materials', message: String(error) });
  }
}
