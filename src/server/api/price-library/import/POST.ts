import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { priceLibrary } from '../../../db/schema.js';

interface CsvRow {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unitPrice: string;
  vendor?: string;
  sku?: string;
  notes?: string;
}

export default async function handler(req: Request, res: Response) {
  try {
    const { rows } = req.body as { rows: CsvRow[] };
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' });
    const valid = rows.filter(r => r.name && r.unitPrice && !isNaN(parseFloat(r.unitPrice)));
    if (!valid.length) return res.status(400).json({ error: 'No valid rows found' });
    const values = valid.map(r => ({
      name: r.name.trim(),
      description: r.description?.trim() || null,
      category: r.category?.trim() || 'materials',
      unit: r.unit?.trim() || 'ea',
      unitPrice: parseFloat(r.unitPrice).toFixed(2),
      vendor: r.vendor?.trim() || null,
      sku: r.sku?.trim() || null,
      notes: r.notes?.trim() || null,
    }));
    await db.insert(priceLibrary).values(values);
    res.status(201).json({ imported: values.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import price library', message: String(err) });
  }
}