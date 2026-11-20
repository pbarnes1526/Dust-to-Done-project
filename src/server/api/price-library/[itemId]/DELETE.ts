import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { priceLibrary } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ itemId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.itemId, 10);
    await db.delete(priceLibrary).where(eq(priceLibrary.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete price library item', message: String(err) });
  }
}