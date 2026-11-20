import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { documents } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, name, fileUrl, fileType, fileSize, category, notes } = req.body as {
      jobId: number; name: string; fileUrl: string;
      fileType?: string; fileSize?: number;
      category?: 'contract' | 'permit' | 'photo' | 'estimate' | 'other';
      notes?: string;
    };
    if (!jobId || !name || !fileUrl) {
      return res.status(400).json({ error: 'jobId, name, and fileUrl are required' });
    }
    const result = await db.insert(documents).values({
      jobId,
      name,
      fileUrl,
      fileType: fileType ?? null,
      fileSize: fileSize ?? null,
      category: category ?? 'other',
      notes: notes ?? null,
    });
    const [created] = await db.select().from(documents).where(eq(documents.id, Number(result[0].insertId))).limit(1);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create document', message: String(error) });
  }
}
