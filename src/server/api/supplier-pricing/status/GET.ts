// GET /api/supplier-pricing/status
// Returns connection status for all suppliers.
// Uses stored DB status by default; pass ?live=1 to trigger a live Scavio check
// (only used by the manual refresh flow to avoid concurrency conflicts).
import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { supplierConnectionStatus } from '../../../db/schema.js';
import { menardsProvider } from '../../../services/menards-provider.js';
import { lowesProvider } from '../../../services/lowes-provider.js';
import { getSecret } from '#airo/secrets';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const stored = await db.select().from(supplierConnectionStatus);

    // Default: derive live status from API key presence only (no Scavio call)
    // Pass ?live=1 to do a real check (manual refresh only)
    const doLiveCheck = req.query.live === '1';

    let menardsLive;
    let lowesLive;

    if (doLiveCheck) {
      // Sequential to respect Scavio free-plan concurrency limit
      menardsLive = await menardsProvider.getConnectionStatus();
      lowesLive = await lowesProvider.getConnectionStatus();
    } else {
      // Fast path: just check if the API key is configured
      const apiKey = getSecret('SCAVIO_API_KEY');
      const status = apiKey ? 'connected' : 'awaiting_authorization';
      const msg = apiKey
        ? 'Connected via Scavio API. Store: Terre Haute, IN.'
        : 'SCAVIO_API_KEY is not configured. Add it in Airo Secrets to enable live pricing.';
      menardsLive = { supplier: 'Menards', connectionStatus: status, message: msg, lastChecked: new Date() };
      lowesLive = { supplier: "Lowe's", connectionStatus: status, message: msg, lastChecked: new Date() };
    }

    res.json({
      live: { menards: menardsLive, lowes: lowesLive },
      stored,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status', message: String(err) });
  }
}
