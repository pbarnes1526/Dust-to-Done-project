import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { companySettings } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { companyName, address, city, state, zip, phone, email, website, logoOnPrint, defaultLaborRate, defaultOverheadPct, defaultProfitPct } = req.body as {
      companyName: string; address: string; city: string; state: string; zip: string;
      phone: string; email: string; website: string; logoOnPrint: number;
      defaultLaborRate?: string; defaultOverheadPct?: string; defaultProfitPct?: string;
    };
    const rows = await db.select().from(companySettings).limit(1);
    const vals = { companyName, address, city, state, zip, phone, email, website, logoOnPrint,
      ...(defaultLaborRate !== undefined && { defaultLaborRate }),
      ...(defaultOverheadPct !== undefined && { defaultOverheadPct }),
      ...(defaultProfitPct !== undefined && { defaultProfitPct }),
    };
    if (rows.length === 0) {
      await db.insert(companySettings).values(vals);
    } else {
      const { eq } = await import('drizzle-orm');
      await db.update(companySettings).set(vals).where(eq(companySettings.id, rows[0].id));
    }
    const [updated] = await db.select().from(companySettings).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save company settings', message: String(error) });
  }
}
