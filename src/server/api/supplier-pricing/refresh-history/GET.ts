// GET /api/supplier-pricing/refresh-history?limit=20
// Returns the most recent price refresh run records.
import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { pricingRefreshHistory } from '../../../db/schema.js';
import { desc } from 'drizzle-orm';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const rows = await db
      .select()
      .from(pricingRefreshHistory)
      .orderBy(desc(pricingRefreshHistory.startedAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch refresh history', message: String(err) });
  }
}
