import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeLabor } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    const { replace, items } = req.body as {
      replace?: boolean;
      items: { taskId?: number; description: string; hours: string; workers: string; crewDays: string; rate: string; assumptions?: string; requiresInspection?: number; aiGenerated?: number; sortOrder?: number }[];
    };

    if (replace) await db.delete(scopeLabor).where(eq(scopeLabor.projectId, projectId));
    if (!items || items.length === 0) return res.json([]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const hours = Number(item.hours) || 0;
      const workers = Number(item.workers) || 1;
      const rate = Number(item.rate) || 65;
      const extended = hours * workers * rate;
      const crewDays = Number(item.crewDays) || (hours / 8);
      await db.insert(scopeLabor).values({
        projectId,
        taskId: item.taskId ?? null,
        description: item.description,
        hours: String(hours),
        workers,
        crewDays: String(Math.round(crewDays * 100) / 100),
        rate: String(rate),
        extended: String(Math.round(extended * 100) / 100),
        assumptions: item.assumptions ?? null,
        requiresInspection: item.requiresInspection ?? 0,
        aiGenerated: item.aiGenerated ?? 0,
        sortOrder: item.sortOrder ?? i,
      });
    }

    const all = await db.select().from(scopeLabor).where(eq(scopeLabor.projectId, projectId)).orderBy(asc(scopeLabor.sortOrder));
    return res.status(201).json(all);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save labor', message: String(error) });
  }
}
