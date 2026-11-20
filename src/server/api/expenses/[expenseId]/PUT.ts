import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { expenses } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ expenseId: string }>, res: Response) {
  try {
    const id = Number(req.params.expenseId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { jobId, vendor, description, amount, category, receiptUrl, expenseDate } = req.body as {
      jobId?: number; vendor?: string; description?: string; amount?: number;
      category?: string; receiptUrl?: string; expenseDate?: string;
    };
    await db.update(expenses).set({
      jobId: jobId ?? null, vendor, description,
      amount: amount !== undefined ? String(Number(amount).toFixed(2)) : undefined,
      category: category as 'materials' | 'labor' | 'equipment' | 'permits' | 'other' | undefined,
      receiptUrl, expenseDate,
    }).where(eq(expenses.id, id));
    const [updated] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update expense', message: String(error) });
  }
}
