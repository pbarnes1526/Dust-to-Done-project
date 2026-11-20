import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopePhotos } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ scopeId: string; photoId: string }>, res: Response) {
  try {
    const photoId = Number(req.params.photoId);
    if (isNaN(photoId)) return res.status(400).json({ error: 'Invalid photoId' });

    const [photo] = await db.select().from(scopePhotos).where(eq(scopePhotos.id, photoId)).limit(1);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    try {
      await fs.unlink(path.join('/shared-storage/public/assets/uploads/scope', photo.filename));
    } catch { /* ignore */ }

    await db.delete(scopePhotos).where(eq(scopePhotos.id, photoId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete photo', message: String(error) });
  }
}
