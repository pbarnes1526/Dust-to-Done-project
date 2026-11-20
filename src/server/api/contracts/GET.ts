import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { contracts, jobs } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db
      .select({
        contract: contracts,
        jobName: jobs.name,
      })
      .from(contracts)
      .leftJoin(jobs, eq(contracts.jobId, jobs.id))
      .orderBy(desc(contracts.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contracts', message: String(err) });
  }
}
