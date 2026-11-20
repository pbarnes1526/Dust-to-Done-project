import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeTasks } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; taskId: string }>, res: Response) {
  try {
    const taskId = Number(req.params.taskId);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid taskId' });

    const { phase, description, sortOrder, flagged, flagNote } = req.body as {
      phase?: string; description?: string; sortOrder?: number; flagged?: number; flagNote?: string;
    };

    await db.update(scopeTasks).set({
      ...(phase !== undefined && { phase: phase as 'preparation' | 'demolition' | 'installation' | 'finishing' }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(flagged !== undefined && { flagged }),
      ...(flagNote !== undefined && { flagNote: flagNote ?? null }),
    }).where(eq(scopeTasks.id, taskId));

    const [updated] = await db.select().from(scopeTasks).where(eq(scopeTasks.id, taskId)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update task', message: String(error) });
  }
}
