import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffProjects, takeoffMaterials, takeoffEstimates } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const sourceId = Number(req.params.projectId);
    if (isNaN(sourceId)) return res.status(400).json({ error: 'Invalid projectId' });
    const [source] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, sourceId)).limit(1);
    if (!source) return res.status(404).json({ error: 'Source project not found' });
    const [result] = await db.insert(takeoffProjects).values({
      projectName: source.projectName + ' (Copy)',
      customerName: source.customerName,
      customerEmail: source.customerEmail,
      customerPhone: source.customerPhone,
      address: source.address,
      description: source.description,
      dimensions: source.dimensions,
      notes: source.notes,
      status: 'draft',
    });
    const newId = result.insertId;
    // copy materials
    const materials = await db.select().from(takeoffMaterials).where(eq(takeoffMaterials.projectId, sourceId)).orderBy(asc(takeoffMaterials.sortOrder));
    for (const m of materials) {
      await db.insert(takeoffMaterials).values({ ...m, id: undefined, projectId: newId });
    }
    // copy estimate
    const [est] = await db.select().from(takeoffEstimates).where(eq(takeoffEstimates.projectId, sourceId)).limit(1);
    if (est) {
      await db.insert(takeoffEstimates).values({ ...est, id: undefined, projectId: newId });
    } else {
      await db.insert(takeoffEstimates).values({ projectId: newId });
    }
    const [newProject] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, newId)).limit(1);
    return res.status(201).json(newProject);
  } catch (error) {
    return res.status(500).json({ error: 'Duplicate failed', message: String(error) });
  }
}
