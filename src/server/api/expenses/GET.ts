import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { expenses, jobs } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId } = req.query;
    const rows = jobId
      ? await db.select().from(expenses).where(eq(expenses.jobId, Number(jobId))).orderBy(desc(expenses.expenseDate))
      : await db.select({ expense: expenses, jobName: jobs.name })
          .from(expenses)
          .leftJoin(jobs, eq(expenses.jobId, jobs.id))
          .orderBy(desc(expenses.expenseDate));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses', message: String(error) });
  }
}
