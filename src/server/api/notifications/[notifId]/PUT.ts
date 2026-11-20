import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { notifications } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ notifId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.notifId);
    await db.update(notifications).set({ read: 1 }).where(eq(notifications.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
