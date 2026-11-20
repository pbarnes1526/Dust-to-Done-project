import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { customers, jobs, estimates, invoices } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ customerId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.customerId);
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    if (!cust) return res.status(404).json({ error: 'Not found' });
    const custJobs = await db.select().from(jobs).where(eq(jobs.clientEmail, cust.email ?? ''));
    const custEstimates = await db.select().from(estimates).where(eq(estimates.clientEmail, cust.email ?? ''));
    const custInvoices = await db.select().from(invoices).where(eq(invoices.clientEmail, cust.email ?? ''));
    res.json({ ...cust, jobs: custJobs, estimates: custEstimates, invoices: custInvoices });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
