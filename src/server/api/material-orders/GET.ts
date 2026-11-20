import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { materialOrders, jobs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId } = req.query as { jobId?: string };
    if (jobId) {
      const rows = await db.select().from(materialOrders).where(eq(materialOrders.jobId, parseInt(jobId))).orderBy(materialOrders.createdAt);
      return res.json(rows);
    }
    const rows = await db.select({ order: materialOrders, job: jobs })
      .from(materialOrders)
      .leftJoin(jobs, eq(materialOrders.jobId, jobs.id))
      .orderBy(materialOrders.createdAt);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
