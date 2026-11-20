import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { notifications } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { type, title, message, jobId } = req.body;
    if (!type || !title || !message) return res.status(400).json({ error: 'type, title, message required' });
    const [result] = await db.insert(notifications).values({ type, title, message, jobId: jobId || null, read: 0 });
    const id = (result as { insertId: number }).insertId;
    res.status(201).json({ id, type, title, message, jobId: jobId || null, read: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
