import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { takeoffProjects, takeoffMaterials } from '../../db/schema.js';
import { desc, sql } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const projects = await db.select().from(takeoffProjects).orderBy(desc(takeoffProjects.createdAt));
    // attach material counts
    const counts = await db
      .select({ projectId: takeoffMaterials.projectId, count: sql<number>`count(*)` })
      .from(takeoffMaterials)
      .groupBy(takeoffMaterials.projectId);
    const countMap: Record<number, number> = {};
    for (const c of counts) countMap[c.projectId] = Number(c.count);
    return res.json(projects.map(p => ({ ...p, materialCount: countMap[p.id] ?? 0 })));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch projects', message: String(error) });
  }
}
