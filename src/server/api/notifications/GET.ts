import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { notifications } from '../../db/schema.js';
import { desc } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
