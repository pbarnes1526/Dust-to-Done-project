// POST /api/supplier-pricing/refresh
// Triggers a manual price refresh run immediately.
import type { Request, Response } from 'express';
import { runPriceRefresh } from '../../../services/price-refresh-scheduler.js';

export default async function handler(_req: Request, res: Response): Promise<void> {
  try {
    // Run async -- respond immediately so the UI doesn't time out
    res.json({ ok: true, message: 'Price refresh started' });
    runPriceRefresh().catch(err => {
      console.error('[supplier-pricing] Manual refresh error:', err);
    });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed', message: String(err) });
  }
}
