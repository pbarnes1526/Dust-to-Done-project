import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { vendors, expenses } from '../../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: Request<{ vendorId: string }>, res: Response) {
  try {
    const id = Number(req.params.vendorId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const vendorExpenses = vendor.name
      ? await db.select().from(expenses).where(eq(expenses.vendor, vendor.name)).orderBy(desc(expenses.expenseDate)).limit(20)
      : [];
    return res.json({ vendor, expenses: vendorExpenses });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch vendor', message: String(error) });
  }
}
