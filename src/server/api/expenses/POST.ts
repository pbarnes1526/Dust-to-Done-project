import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { expenses } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, vendor, description, amount, category, receiptUrl, expenseDate } = req.body as {
      jobId?: number; vendor: string; description: string; amount: number;
      category?: string; receiptUrl?: string; expenseDate?: string;
    };
    if (!vendor || !description || !amount) return res.status(400).json({ error: 'vendor, description, and amount are required' });
    const result = await db.insert(expenses).values({
      jobId: jobId ?? null, vendor, description,
      amount: String(Number(amount).toFixed(2)),
      category: (category as 'materials' | 'labor' | 'equipment' | 'permits' | 'other') ?? 'other',
      receiptUrl: receiptUrl ?? null, expenseDate: expenseDate ?? null,
    });
    const [created] = await db.select().from(expenses).where(eq(expenses.id, Number(result[0].insertId))).limit(1);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create expense', message: String(error) });
  }
}
