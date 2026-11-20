import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopePhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';

const UPLOAD_DIR = '/shared-storage/public/assets/uploads/scope';

// Ensure directory exists before multer storage is configured
try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch { /* already exists */ }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `scope-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

export const multerMiddleware = upload.array('photos', 10);

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    for (const file of files) {
      const url = `/airo-assets/uploads/scope/${file.filename}`;
      await db.insert(scopePhotos).values({
        projectId, filename: file.filename, originalName: file.originalname,
        mimeType: file.mimetype, url,
      });
    }

    const all = await db.select().from(scopePhotos).where(eq(scopePhotos.projectId, projectId));
    return res.status(201).json(all);
  } catch (error) {
    return res.status(500).json({ error: 'Photo upload failed', message: String(error) });
  }
}
