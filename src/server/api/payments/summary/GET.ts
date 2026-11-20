import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { payments } from '../../../db/schema.js';
import { sql } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [totals] = await db.select({
      totalCollected: sql<string>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(payments);

    const [monthTotals] = await db.select({
      monthCollected: sql<string>`COALESCE(SUM(amount), 0)`,
    }).from(payments).where(sql`payment_date >= ${monthStart}`);

    res.json({
      totalCollected: parseFloat(totals?.totalCollected ?? '0'),
      monthCollected: parseFloat(monthTotals?.monthCollected ?? '0'),
      count: totals?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment summary', message: String(err) });
  }
}
