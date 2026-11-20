// GET /api/estimates/view/:token — public, no auth required
import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { estimates, estimateLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ token: string }>, res: Response) {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Invalid token' });

    const [est] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.viewToken, token))
      .limit(1);

    if (!est) return res.status(404).json({ error: 'Estimate not found' });

    const lineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, est.id))
      .orderBy(asc(estimateLineItems.sortOrder));

    return res.json({ ...est, lineItems });
  } catch (error) {
    console.error('estimate view error:', error);
    return res.status(500).json({ error: 'Failed to load estimate' });
  }
}
