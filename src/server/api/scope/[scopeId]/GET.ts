import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { scopeProjects, scopePhotos, scopeTasks, scopeLabor, scopeCostSummary, scopeChangeOrders } from '../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const id = Number(req.params.scopeId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid scopeId' });

    const [project] = await db.select().from(scopeProjects).where(eq(scopeProjects.id, id)).limit(1);
    if (!project) return res.status(404).json({ error: 'Scope project not found' });

    const [photos, tasks, labor, changeOrders] = await Promise.all([
      db.select().from(scopePhotos).where(eq(scopePhotos.projectId, id)).orderBy(asc(scopePhotos.createdAt)),
      db.select().from(scopeTasks).where(eq(scopeTasks.projectId, id)).orderBy(asc(scopeTasks.sortOrder)),
      db.select().from(scopeLabor).where(eq(scopeLabor.projectId, id)).orderBy(asc(scopeLabor.sortOrder)),
      db.select().from(scopeChangeOrders).where(eq(scopeChangeOrders.projectId, id)).orderBy(asc(scopeChangeOrders.createdAt)),
    ]);
    const [costSummary] = await db.select().from(scopeCostSummary).where(eq(scopeCostSummary.projectId, id)).limit(1);

    return res.json({ project, photos, tasks, labor, costSummary: costSummary ?? null, changeOrders });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch scope project', message: String(error) });
  }
}
