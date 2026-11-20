import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { scopeProjects, scopePhotos, scopeTasks, scopeLabor, scopeCostSummary, scopeChangeOrders } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const id = Number(req.params.scopeId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid scopeId' });

    // Delete photos from disk
    const photos = await db.select().from(scopePhotos).where(eq(scopePhotos.projectId, id));
    for (const photo of photos) {
      try {
        await fs.unlink(path.join('/shared-storage/public/assets/uploads/scope', photo.filename));
      } catch { /* ignore missing files */ }
    }

    // Delete all related records
    await db.delete(scopeChangeOrders).where(eq(scopeChangeOrders.projectId, id));
    await db.delete(scopeCostSummary).where(eq(scopeCostSummary.projectId, id));
    await db.delete(scopeLabor).where(eq(scopeLabor.projectId, id));
    await db.delete(scopeTasks).where(eq(scopeTasks.projectId, id));
    await db.delete(scopePhotos).where(eq(scopePhotos.projectId, id));
    await db.delete(scopeProjects).where(eq(scopeProjects.id, id));

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete scope project', message: String(error) });
  }
}
