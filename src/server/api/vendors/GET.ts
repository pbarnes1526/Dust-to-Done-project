import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { vendors } from '../../db/schema.js';
import { asc } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db.select().from(vendors).orderBy(asc(vendors.name));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors', message: String(error) });
  }
}
