import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { jobMaterials } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; materialId: string }>, res: Response) {
  try {
    const id = Number(req.params.materialId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid materialId' });
    const { description, quantity, unit, estimatedCost, status, vendor, notes } = req.body as {
      description?: string; quantity?: string; unit?: string; estimatedCost?: string | null;
      status?: 'needed' | 'ordered' | 'received'; vendor?: string | null; notes?: string | null;
    };
    await db.update(jobMaterials).set({
      ...(description !== undefined && { description }),
      ...(quantity !== undefined && { quantity }),
      ...(unit !== undefined && { unit }),
      ...(estimatedCost !== undefined && { estimatedCost }),
      ...(status !== undefined && { status }),
      ...(vendor !== undefined && { vendor }),
      ...(notes !== undefined && { notes }),
    }).where(eq(jobMaterials.id, id));
    const [updated] = await db.select().from(jobMaterials).where(eq(jobMaterials.id, id)).limit(1);
    if (!updated) return res.status(404).json({ error: 'Material not found' });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update material', message: String(error) });
  }
}
