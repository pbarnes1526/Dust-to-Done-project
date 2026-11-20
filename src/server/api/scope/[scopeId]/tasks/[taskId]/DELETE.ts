import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeTasks, scopeLabor } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; taskId: string }>, res: Response) {
  try {
    const taskId = Number(req.params.taskId);
    if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid taskId' });
    // Null out labor references to this task (don't delete the labor rows)
    await db.update(scopeLabor).set({ taskId: null }).where(eq(scopeLabor.taskId, taskId));
    await db.delete(scopeTasks).where(eq(scopeTasks.id, taskId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete task', message: String(error) });
  }
}
