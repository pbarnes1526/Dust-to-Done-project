import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { payments } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ paymentId: string }>, res: Response) {
  try {
    const id = Number(req.params.paymentId);
    const { jobId, invoiceId, amount, paymentDate, method, referenceNumber, notes } = req.body;
    await db.update(payments).set({
      jobId: jobId ? Number(jobId) : null,
      invoiceId: invoiceId ? Number(invoiceId) : null,
      amount: String(amount),
      paymentDate: String(paymentDate),
      method: method || 'check',
      referenceNumber: referenceNumber || null,
      notes: notes || null,
    }).where(eq(payments.id, id));
    const [row] = await db.select().from(payments).where(eq(payments.id, id));
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment', message: String(err) });
  }
}
