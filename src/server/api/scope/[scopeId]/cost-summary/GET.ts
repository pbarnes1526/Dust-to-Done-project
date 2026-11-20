import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeCostSummary } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });
    const [cs] = await db.select().from(scopeCostSummary).where(eq(scopeCostSummary.projectId, projectId)).limit(1);
    return res.json(cs ?? null);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch cost summary', message: String(error) });
  }
}
