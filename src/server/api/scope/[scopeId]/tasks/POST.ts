import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeTasks } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    const { replace, items } = req.body as {
      replace?: boolean;
      items: { phase: string; description: string; sortOrder?: number; flagged?: number; flagNote?: string; aiGenerated?: number }[];
    };

    if (replace) await db.delete(scopeTasks).where(eq(scopeTasks.projectId, projectId));

    if (!items || items.length === 0) return res.json([]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.insert(scopeTasks).values({
        projectId,
        phase: item.phase as 'preparation' | 'demolition' | 'installation' | 'finishing',
        description: item.description,
        sortOrder: item.sortOrder ?? i,
        flagged: item.flagged ?? 0,
        flagNote: item.flagNote ?? null,
        aiGenerated: item.aiGenerated ?? 0,
      });
    }

    const all = await db.select().from(scopeTasks).where(eq(scopeTasks.projectId, projectId)).orderBy(asc(scopeTasks.sortOrder));
    return res.status(201).json(all);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save tasks', message: String(error) });
  }
}
