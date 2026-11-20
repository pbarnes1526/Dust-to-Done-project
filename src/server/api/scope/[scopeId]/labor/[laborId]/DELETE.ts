import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeLabor } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; laborId: string }>, res: Response) {
  try {
    const laborId = Number(req.params.laborId);
    if (isNaN(laborId)) return res.status(400).json({ error: 'Invalid laborId' });
    await db.delete(scopeLabor).where(eq(scopeLabor.id, laborId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete labor row', message: String(error) });
  }
}
