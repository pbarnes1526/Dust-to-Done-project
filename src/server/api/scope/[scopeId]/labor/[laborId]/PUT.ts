import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeLabor } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; laborId: string }>, res: Response) {
  try {
    const laborId = Number(req.params.laborId);
    if (isNaN(laborId)) return res.status(400).json({ error: 'Invalid laborId' });

    const { description, hours, workers, crewDays, rate, assumptions, requiresInspection, sortOrder } = req.body as {
      description?: string; hours?: string; workers?: number; crewDays?: string; rate?: string;
      assumptions?: string; requiresInspection?: number; sortOrder?: number;
    };

    const h = hours !== undefined ? Number(hours) : undefined;
    const w = workers !== undefined ? Number(workers) : undefined;
    const r = rate !== undefined ? Number(rate) : undefined;

    // Recalculate extended if any of hours/workers/rate changed
    let extended: string | undefined;
    if (h !== undefined || w !== undefined || r !== undefined) {
      const [existing] = await db.select().from(scopeLabor).where(eq(scopeLabor.id, laborId)).limit(1);
      if (existing) {
        const fh = h ?? Number(existing.hours);
        const fw = w ?? existing.workers;
        const fr = r ?? Number(existing.rate);
        extended = String(Math.round(fh * fw * fr * 100) / 100);
      }
    }

    await db.update(scopeLabor).set({
      ...(description !== undefined && { description }),
      ...(h !== undefined && { hours: String(h) }),
      ...(w !== undefined && { workers: w }),
      ...(crewDays !== undefined && { crewDays }),
      ...(r !== undefined && { rate: String(r) }),
      ...(extended !== undefined && { extended }),
      ...(assumptions !== undefined && { assumptions: assumptions ?? null }),
      ...(requiresInspection !== undefined && { requiresInspection }),
      ...(sortOrder !== undefined && { sortOrder }),
    }).where(eq(scopeLabor.id, laborId));

    const [updated] = await db.select().from(scopeLabor).where(eq(scopeLabor.id, laborId)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update labor', message: String(error) });
  }
}
