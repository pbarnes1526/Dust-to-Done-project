import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { companySettings } from '../../../db/schema.js';

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db.select().from(companySettings).limit(1);
    if (rows.length === 0) {
      return res.json({
        id: null,
        companyName: 'Dust to Done Renovation Solutions LLC',
        address: '', city: 'Indianapolis', state: 'IN', zip: '',
        phone: '', email: '', website: '', logoOnPrint: 1,
      });
    }
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch company settings', message: String(error) });
  }
}
