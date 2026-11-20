import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { documents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ docId: string }>, res: Response) {
  try {
    const id = Number(req.params.docId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.delete(documents).where(eq(documents.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete document', message: String(error) });
  }
}
