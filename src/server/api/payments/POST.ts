import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { payments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, invoiceId, amount, paymentDate, method, referenceNumber, notes } = req.body;
    if (!amount || !paymentDate) {
      return res.status(400).json({ error: 'amount and paymentDate are required' });
    }
    const [result] = await db.insert(payments).values({
      jobId: jobId ? Number(jobId) : null,
      invoiceId: invoiceId ? Number(invoiceId) : null,
      amount: String(amount),
      paymentDate: String(paymentDate),
      method: method || 'check',
      referenceNumber: referenceNumber || null,
      notes: notes || null,
    });
    const newId = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(payments).where(eq(payments.id, newId));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payment', message: String(err) });
  }
}
