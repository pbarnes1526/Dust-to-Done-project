import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { payments, jobs, invoices } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, invoiceId } = req.query;
    let rows;
    if (jobId) {
      rows = await db.select().from(payments).where(eq(payments.jobId, Number(jobId))).orderBy(desc(payments.paymentDate));
    } else if (invoiceId) {
      rows = await db.select().from(payments).where(eq(payments.invoiceId, Number(invoiceId))).orderBy(desc(payments.paymentDate));
    } else {
      rows = await db.select({
        id: payments.id,
        jobId: payments.jobId,
        invoiceId: payments.invoiceId,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        method: payments.method,
        referenceNumber: payments.referenceNumber,
        notes: payments.notes,
        createdAt: payments.createdAt,
        jobName: jobs.name,
        invoiceNumber: invoices.invoiceNumber,
      })
        .from(payments)
        .leftJoin(jobs, eq(payments.jobId, jobs.id))
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .orderBy(desc(payments.paymentDate));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments', message: String(err) });
  }
}
