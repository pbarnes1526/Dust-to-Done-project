import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { estimates } from '../../db/schema.js';
import { desc } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db.select().from(estimates).orderBy(desc(estimates.createdAt));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch estimates', message: String(error) });
  }
}
