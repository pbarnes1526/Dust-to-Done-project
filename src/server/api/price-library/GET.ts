import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { priceLibrary } from '../../db/schema.js';
import { asc, like, eq, and } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { search, category } = req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(like(priceLibrary.name, `%${search}%`));
    if (category && category !== 'all') conditions.push(eq(priceLibrary.category, category));
    const rows = conditions.length
      ? await db.select().from(priceLibrary).where(and(...conditions)).orderBy(asc(priceLibrary.name))
      : await db.select().from(priceLibrary).orderBy(asc(priceLibrary.name));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price library', message: String(err) });
  }
}