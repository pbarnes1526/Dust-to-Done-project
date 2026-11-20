import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { estimates, estimateLineItems, documentSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

interface LineItemInput {
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  sortOrder: number;
  photoUrl?: string | null;
}

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, clientName, clientEmail, clientPhone, clientAddress, projectDescription, notes, validUntil, lineItems } = req.body as {
      jobId?: number; clientName: string; clientEmail?: string; clientPhone?: string;
      clientAddress?: string; projectDescription?: string; notes?: string;
      validUntil?: string; lineItems: LineItemInput[];
    };
    if (!clientName) return res.status(400).json({ error: 'clientName is required' });

    const items: LineItemInput[] = Array.isArray(lineItems) ? lineItems : [];
    const subtotal = items.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const total = subtotal; // no tax

    const [docSettings] = await db.select().from(documentSettings).limit(1);
    const prefix = docSettings?.estimatePrefix ?? 'EST';
    const useYear = (docSettings?.estimateYearFormat ?? 1) === 1;
    const count = await db.select().from(estimates);
    const seq = String(count.length + 1).padStart(4, '0');
    const estimateNumber = useYear ? `${prefix}-${new Date().getFullYear()}-${seq}` : `${prefix}-${seq}`;

    const result = await db.insert(estimates).values({
      jobId: jobId ?? null, estimateNumber, clientName,
      clientEmail: clientEmail ?? null, clientPhone: clientPhone ?? null,
      clientAddress: clientAddress ?? null, projectDescription: projectDescription ?? null,
      subtotal: String(subtotal), taxRate: '0', taxAmount: '0', total: String(total),
      notes: notes ?? null, validUntil: validUntil ?? null,
    });
    const insertId = Number(result[0].insertId);

    if (items.length > 0) {
      await db.insert(estimateLineItems).values(
        items.map((li, i) => ({
          estimateId: insertId,
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

    const [created] = await db.select().from(estimates).where(eq(estimates.id, insertId)).limit(1);
    const lineItemsResult = await db.select().from(estimateLineItems).where(eq(estimateLineItems.estimateId, insertId));
    return res.status(201).json({ ...created, lineItems: lineItemsResult });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create estimate', message: String(error) });
  }
}
