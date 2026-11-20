import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { documents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ docId: string }>, res: Response) {
  try {
    const id = Number(req.params.docId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, category, notes } = req.body as {
      name?: string;
      category?: 'contract' | 'permit' | 'photo' | 'estimate' | 'other';
      notes?: string;
    };
    await db.update(documents).set({ name, category, notes: notes ?? null }).where(eq(documents.id, id));
    const [updated] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update document', message: String(error) });
  }
}
