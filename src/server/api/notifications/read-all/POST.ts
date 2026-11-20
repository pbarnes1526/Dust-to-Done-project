import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { notifications } from '../../../db/schema.js';

export default async function handler(_req: Request, res: Response) {
  try {
    await db.update(notifications).set({ read: 1 });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
