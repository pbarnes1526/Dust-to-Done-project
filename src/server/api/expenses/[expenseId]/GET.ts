import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { expenses } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ expenseId: string }>, res: Response) {
  try {
    const id = Number(req.params.expenseId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [row] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Expense not found' });
    return res.json(row);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch expense', message: String(error) });
  }
}
