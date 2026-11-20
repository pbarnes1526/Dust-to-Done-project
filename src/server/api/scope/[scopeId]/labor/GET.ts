import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeLabor } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });
    const labor = await db.select().from(scopeLabor).where(eq(scopeLabor.projectId, projectId)).orderBy(asc(scopeLabor.sortOrder));
    return res.json(labor);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch labor', message: String(error) });
  }
}
