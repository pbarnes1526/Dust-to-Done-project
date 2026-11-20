import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { estimates, estimateLineItems } from '../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

interface LineItemInput {
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  sortOrder: number;
  photoUrl?: string | null;
}

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { jobId, clientName, clientEmail, clientPhone, clientAddress, projectDescription, status, notes, validUntil, lineItems } = req.body as {
      jobId?: number; clientName?: string; clientEmail?: string; clientPhone?: string;
      clientAddress?: string; projectDescription?: string; status?: string;
      notes?: string; validUntil?: string; lineItems?: LineItemInput[];
    };

    const items: LineItemInput[] = Array.isArray(lineItems) ? lineItems : [];
    const subtotal = items.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const total = subtotal; // no tax

    await db.update(estimates).set({
      jobId: jobId ?? null, clientName, clientEmail, clientPhone, clientAddress,
      projectDescription, status: (status as 'draft' | 'sent' | 'approved' | 'declined') ?? undefined,
      subtotal: String(subtotal), taxRate: '0', taxAmount: '0', total: String(total),
      notes, validUntil,
    }).where(eq(estimates.id, id));

    if (items.length > 0) {
      await db.delete(estimateLineItems).where(eq(estimateLineItems.estimateId, id));
      await db.insert(estimateLineItems).values(
        items.map((li, i) => ({
          estimateId: id,
          description: li.description,
          category: li.category,
          quantity: String(li.quantity),
          unit: li.unit || 'each',
          unitPrice: String(li.unitPrice),
          lineTotal: String(li.quantity * li.unitPrice),
          sortOrder: li.sortOrder ?? i,
          photoUrl: li.photoUrl ?? null,
        }))
      );
    }

    const [updated] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    const lineItemsResult = await db.select().from(estimateLineItems).where(eq(estimateLineItems.estimateId, id)).orderBy(asc(estimateLineItems.sortOrder));
    return res.json({ ...updated, lineItems: lineItemsResult });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update estimate', message: String(error) });
  }
}
