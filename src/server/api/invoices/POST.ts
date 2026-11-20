import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { invoices, invoiceLineItems, documentSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'materials' | 'other';
}

export default async function handler(req: Request, res: Response) {
  try {
    const {
      jobId, clientName, clientEmail, clientAddress, projectDescription,
      status, taxRate, dueDate, notes, lineItems,
    } = req.body as {
      jobId?: number; clientName: string; clientEmail?: string; clientAddress?: string;
      projectDescription?: string; status?: string; taxRate?: number;
      dueDate?: string; notes?: string; lineItems: LineItemInput[];
    };

    if (!clientName) return res.status(400).json({ error: 'clientName is required' });

    // Generate invoice number using configured prefix
    const [docSettings] = await db.select().from(documentSettings).limit(1);
    const prefix = docSettings?.invoicePrefix ?? 'INV';
    const useYear = (docSettings?.invoiceYearFormat ?? 1) === 1;
    const count = await db.select().from(invoices);
    const seq = String(count.length + 1).padStart(4, '0');
    const invoiceNumber = useYear ? `${prefix}-${new Date().getFullYear()}-${seq}` : `${prefix}-${seq}`;

    const subtotal = (lineItems ?? []).reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const rate = taxRate ?? 0;
    const taxAmt = subtotal * (rate / 100);
    const total = subtotal + taxAmt;

    const result = await db.insert(invoices).values({
      jobId: jobId ?? null,
      invoiceNumber,
      status: (status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled') ?? 'draft',
      clientName,
      clientEmail: clientEmail ?? null,
      clientAddress: clientAddress ?? null,
      projectDescription: projectDescription ?? null,
      subtotal: subtotal.toFixed(2),
      taxRate: rate.toFixed(2),
      tax: taxAmt.toFixed(2),
      total: total.toFixed(2),
      dueDate: dueDate ?? null,
      notes: notes ?? null,
    });

    const invoiceId = Number(result[0].insertId);

    if (lineItems?.length) {
      await db.insert(invoiceLineItems).values(
        lineItems.map(li => ({
          invoiceId,
          description: li.description,
          quantity: li.quantity.toFixed(2),
          unitPrice: li.unitPrice.toFixed(2),
          lineTotal: (li.quantity * li.unitPrice).toFixed(2),
          type: li.type ?? 'other',
        }))
      );
    }

    const [created] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    const items = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
    return res.status(201).json({ ...created, lineItems: items });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create invoice', message: String(error) });
  }
}
