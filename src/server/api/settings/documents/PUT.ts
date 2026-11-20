import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { documentSettings } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const data = req.body as {
      estimatePrefix: string; estimateYearFormat: number;
      invoicePrefix: string; invoiceYearFormat: number;
      estimateTerms: string; invoiceTerms: string;
      estimateHeaderText: string; estimateFooterText: string;
      invoiceHeaderText: string; invoiceFooterText: string;
      estimateSignatureLine: number;
      estimateEmailMessage: string; invoiceEmailMessage: string;
    };
    const rows = await db.select().from(documentSettings).limit(1);
    if (rows.length === 0) {
      await db.insert(documentSettings).values(data);
    } else {
      const { eq } = await import('drizzle-orm');
      await db.update(documentSettings).set(data).where(eq(documentSettings.id, rows[0].id));
    }
    const [updated] = await db.select().from(documentSettings).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save document settings', message: String(error) });
  }
}
