import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { contracts, jobs } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ contractId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.contractId, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });

    const rows = await db
      .select({ contract: contracts, jobName: jobs.name })
      .from(contracts)
      .leftJoin(jobs, eq(contracts.jobId, jobs.id))
      .where(eq(contracts.id, id))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: 'Contract not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contract', message: String(err) });
  }
}
