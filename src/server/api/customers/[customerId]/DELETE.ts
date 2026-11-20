import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { customers } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ customerId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.customerId);
    await db.delete(customers).where(eq(customers.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
