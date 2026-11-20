import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { customers } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ customerId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.customerId);
    const { name, email, phone, address, notes, warrantyInfo } = req.body;
    await db.update(customers).set({ name, email, phone, address, notes, warrantyInfo }).where(eq(customers.id, id));
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
