import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { jobs, expenses, invoices, documents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const id = Number(req.params.jobId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const [jobExpenses, jobInvoices, jobDocuments] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.jobId, id)),
      db.select().from(invoices).where(eq(invoices.jobId, id)),
      db.select().from(documents).where(eq(documents.jobId, id)),
    ]);
    return res.json({ ...job, expenses: jobExpenses, invoices: jobInvoices, documents: jobDocuments });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job', message: String(error) });
  }
}
