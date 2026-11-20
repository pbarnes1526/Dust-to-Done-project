import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { documentSettings } from '../../../db/schema.js';

const DEFAULTS = {
  id: null,
  estimatePrefix: 'EST', estimateYearFormat: 1,
  invoicePrefix: 'INV', invoiceYearFormat: 1,
  estimateTerms: 'This estimate is valid for 30 days from the date issued. Work will commence upon written approval. A 50% deposit is required before work begins.',
  invoiceTerms: 'Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly finance charge.',
  estimateHeaderText: '', estimateFooterText: '',
  invoiceHeaderText: '', invoiceFooterText: '',
  estimateSignatureLine: 1,
  estimateEmailMessage: 'Please find your estimate attached. Review the details and let us know if you have any questions or would like to proceed.',
  invoiceEmailMessage: 'Please find your invoice attached. Payment is due by the date noted. Thank you for your business!',
};

export default async function handler(_req: Request, res: Response) {
  try {
    const rows = await db.select().from(documentSettings).limit(1);
    if (rows.length === 0) return res.json(DEFAULTS);
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch document settings', message: String(error) });
  }
}
