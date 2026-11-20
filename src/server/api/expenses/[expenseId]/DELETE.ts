import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { expenses } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ expenseId: string }>, res: Response) {
  try {
    const id = Number(req.params.expenseId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.delete(expenses).where(eq(expenses.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete expense', message: String(error) });
  }
}
