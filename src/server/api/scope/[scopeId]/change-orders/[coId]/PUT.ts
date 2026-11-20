import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeChangeOrders } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; coId: string }>, res: Response) {
  try {
    const coId = Number(req.params.coId);
    if (isNaN(coId)) return res.status(400).json({ error: 'Invalid coId' });

    const { title, scopeDescription, additionalMaterials, additionalLabor, priceAdjustment, scheduleAdjustment, status } = req.body as {
      title?: string; scopeDescription?: string; additionalMaterials?: string; additionalLabor?: string;
      priceAdjustment?: string; scheduleAdjustment?: string; status?: string;
    };

    const approvedAt = status === 'approved' ? new Date() : undefined;

    await db.update(scopeChangeOrders).set({
      ...(title !== undefined && { title }),
      ...(scopeDescription !== undefined && { scopeDescription: scopeDescription ?? null }),
      ...(additionalMaterials !== undefined && { additionalMaterials: additionalMaterials ?? null }),
      ...(additionalLabor !== undefined && { additionalLabor: additionalLabor ?? null }),
      ...(priceAdjustment !== undefined && { priceAdjustment }),
      ...(scheduleAdjustment !== undefined && { scheduleAdjustment: scheduleAdjustment ?? null }),
      ...(status !== undefined && { status: status as 'draft' | 'sent' | 'approved' | 'declined' }),
      ...(approvedAt !== undefined && { approvedAt }),
    }).where(eq(scopeChangeOrders.id, coId));

    const [updated] = await db.select().from(scopeChangeOrders).where(eq(scopeChangeOrders.id, coId)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update change order', message: String(error) });
  }
}
