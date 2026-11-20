import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { invoices, jobs } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db
      .select({ invoice: invoices, jobName: jobs.name })
      .from(invoices)
      .leftJoin(jobs, eq(invoices.jobId, jobs.id))
      .orderBy(desc(invoices.createdAt));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices', message: String(error) });
  }
}
