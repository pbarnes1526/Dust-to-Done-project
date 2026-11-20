import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { takeoffMaterials } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string; materialId: string }>, res: Response) {
  try {
    const id = Number(req.params.materialId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid materialId' });
    await db.delete(takeoffMaterials).where(eq(takeoffMaterials.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete material', message: String(error) });
  }
}
