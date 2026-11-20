import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { takeoffPhotos } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ projectId: string; photoId: string }>, res: Response) {
  try {
    const id = Number(req.params.photoId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid photoId' });
    const [photo] = await db.select().from(takeoffPhotos).where(eq(takeoffPhotos.id, id)).limit(1);
    if (photo) {
      try { await fs.unlink(path.join('/shared-storage/public/assets/uploads/takeoff', photo.filename)); } catch { /* ignore */ }
      await db.delete(takeoffPhotos).where(eq(takeoffPhotos.id, id));
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete photo', message: String(error) });
  }
}
