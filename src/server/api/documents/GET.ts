import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { documents, jobs } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const jobId = req.query.jobId ? Number(req.query.jobId) : undefined;
    const query = db
      .select({ doc: documents, jobName: jobs.name })
      .from(documents)
      .leftJoin(jobs, eq(documents.jobId, jobs.id))
      .orderBy(desc(documents.createdAt));
    const rows = await query;
    const filtered = jobId ? rows.filter(r => r.doc.jobId === jobId) : rows;
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents', message: String(error) });
  }
}
