import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { takeoffProjects, takeoffPhotos, takeoffMaterials, takeoffEstimates } from '../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const id = Number(req.params.projectId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid projectId' });
    const [project] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, id)).limit(1);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const [photos, materials, estimates] = await Promise.all([
      db.select().from(takeoffPhotos).where(eq(takeoffPhotos.projectId, id)).orderBy(asc(takeoffPhotos.uploadedAt)),
      db.select().from(takeoffMaterials).where(eq(takeoffMaterials.projectId, id)).orderBy(asc(takeoffMaterials.sortOrder), asc(takeoffMaterials.id)),
      db.select().from(takeoffEstimates).where(eq(takeoffEstimates.projectId, id)).limit(1),
    ]);
    return res.json({ project, photos, materials, estimate: estimates[0] ?? null });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch project', message: String(error) });
  }
}
