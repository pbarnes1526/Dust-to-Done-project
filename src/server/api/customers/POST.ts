import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { customers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, email, phone, address, notes, warrantyInfo } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await db.insert(customers).values({ name, email, phone, address, notes, warrantyInfo });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
