import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { customers } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const all = await db.select().from(customers).orderBy(customers.name);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
