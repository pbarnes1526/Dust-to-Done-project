import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { db } from '../../../../db/client.js';
import { jobPhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

const uploadDir = '/shared-storage/public/assets/uploads/job-photos';
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});

export const multerMiddleware = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }).single('photo');

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const { category, description, takenBy, takenAt } = req.body;
    const url = `/airo-assets/uploads/job-photos/${file.filename}`;
    const [result] = await db.insert(jobPhotos).values({
      jobId, filename: file.filename, originalName: file.originalname,
      url, category: category || 'during', description, takenBy, takenAt,
      mimeType: file.mimetype, sizeBytes: file.size,
    });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(jobPhotos).where(eq(jobPhotos.id, id));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
