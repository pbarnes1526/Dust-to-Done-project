import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeChangeOrders } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    const { title, scopeDescription, additionalMaterials, additionalLabor, priceAdjustment, scheduleAdjustment } = req.body as {
      title: string; scopeDescription?: string; additionalMaterials?: string; additionalLabor?: string;
      priceAdjustment?: string; scheduleAdjustment?: string;
    };
    if (!title) return res.status(400).json({ error: 'title is required' });

    await db.insert(scopeChangeOrders).values({
      projectId, title,
      scopeDescription: scopeDescription ?? null,
      additionalMaterials: additionalMaterials ?? null,
      additionalLabor: additionalLabor ?? null,
      priceAdjustment: priceAdjustment ?? '0',
      scheduleAdjustment: scheduleAdjustment ?? null,
    });

    const all = await db.select().from(scopeChangeOrders).where(eq(scopeChangeOrders.projectId, projectId)).orderBy(asc(scopeChangeOrders.createdAt));
    return res.status(201).json(all);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create change order', message: String(error) });
  }
}
