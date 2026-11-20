import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { payments } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ paymentId: string }>, res: Response) {
  try {
    const id = Number(req.params.paymentId);
    await db.delete(payments).where(eq(payments.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment', message: String(err) });
  }
}
