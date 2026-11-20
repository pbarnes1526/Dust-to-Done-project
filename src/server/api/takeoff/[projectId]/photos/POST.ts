import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffPhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const uploadDir = '/shared-storage/public/assets/uploads/takeoff';
    await fs.mkdir(uploadDir, { recursive: true });

    const inserted: typeof takeoffPhotos.$inferSelect[] = [];
    for (const file of files) {
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const dest = path.join(uploadDir, filename);
      await fs.writeFile(dest, file.buffer);
      const [result] = await db.insert(takeoffPhotos).values({
        projectId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
      const [photo] = await db.select().from(takeoffPhotos).where(eq(takeoffPhotos.id, result.insertId)).limit(1);
      inserted.push(photo);
    }
    return res.status(201).json(inserted);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upload photos', message: String(error) });
  }
}
