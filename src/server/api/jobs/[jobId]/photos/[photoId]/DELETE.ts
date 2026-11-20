import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { jobPhotos } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string; photoId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.photoId);
    await db.delete(jobPhotos).where(eq(jobPhotos.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
