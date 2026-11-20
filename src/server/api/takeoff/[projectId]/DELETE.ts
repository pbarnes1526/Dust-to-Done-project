import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { takeoffProjects, takeoffPhotos, takeoffMaterials, takeoffEstimates } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const id = Number(req.params.projectId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid projectId' });
    // delete photos from disk
    const photos = await db.select().from(takeoffPhotos).where(eq(takeoffPhotos.projectId, id));
    for (const p of photos) {
      try { await fs.unlink(path.join('/shared-storage/public/assets/uploads/takeoff', p.filename)); } catch { /* ignore */ }
    }
    await db.delete(takeoffPhotos).where(eq(takeoffPhotos.projectId, id));
    await db.delete(takeoffMaterials).where(eq(takeoffMaterials.projectId, id));
    await db.delete(takeoffEstimates).where(eq(takeoffEstimates.projectId, id));
    await db.delete(takeoffProjects).where(eq(takeoffProjects.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete project', message: String(error) });
  }
}
