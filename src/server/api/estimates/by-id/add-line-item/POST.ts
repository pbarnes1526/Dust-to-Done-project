import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { estimates, estimateLineItems } from '../../../../db/schema.js';
import { eq, asc, max } from 'drizzle-orm';

// POST /api/estimates/:estimateId/add-line-item
// Appends a single line item to an existing estimate and recalculates totals.
export default async function handler(req: Request<{ estimateId: string }>, res: Response): Promise<void> {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const { description, category, quantity, unit, unitPrice } = req.body as {
      description: string;
      category?: 'labor' | 'materials' | 'equipment' | 'other';
      quantity?: number;
      unit?: string;
      unitPrice: number;
    };

    if (!description || unitPrice == null) {
      res.status(400).json({ error: 'description and unitPrice are required' });
      return;
    }

    const [existing] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Estimate not found' }); return; }

    // Determine next sortOrder
    const [maxRow] = await db
      .select({ maxOrder: max(estimateLineItems.sortOrder) })
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id));
    const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

    const qty = quantity ?? 1;
    const lineTotal = qty * unitPrice;

    await db.insert(estimateLineItems).values({
      estimateId: id,
      description,
      category: category ?? 'materials',
      quantity: String(qty),
      unit: unit ?? 'each',
      unitPrice: String(unitPrice),
      lineTotal: String(lineTotal),
      sortOrder: nextOrder,
      photoUrl: null,
    });

    // Recalculate subtotal / total from all line items
    const allItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id))
      .orderBy(asc(estimateLineItems.sortOrder));

    const subtotal = allItems.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unitPrice), 0);
    await db.update(estimates).set({
      subtotal: String(subtotal),
      taxAmount: '0',
      total: String(subtotal),
    }).where(eq(estimates.id, id));

    const [updated] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    res.status(201).json({ estimate: updated, lineItems: allItems });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add line item', message: String(err) });
  }
}
