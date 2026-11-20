// GET /api/supplier-pricing/history?materialId=&limit=50
// Returns price history records for a material, newest first.
import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { priceHistory } from '../../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const materialId = parseInt(String(req.query.materialId ?? ''), 10);
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);

    if (!materialId) {
      res.status(400).json({ error: 'materialId is required' });
      return;
    }

    const rows = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.materialId, materialId))
      .orderBy(desc(priceHistory.recordedAt))
      .limit(limit);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', message: String(err) });
  }
}
