import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { vendors } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ vendorId: string }>, res: Response) {
  try {
    const id = Number(req.params.vendorId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.delete(vendors).where(eq(vendors.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete vendor', message: String(error) });
  }
}
