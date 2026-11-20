import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/pdf')) {
      return res.status(400).json({ error: 'Only images and PDFs are accepted' });
    }
    const ext = contentType.includes('pdf') ? '.pdf'
      : contentType.includes('png') ? '.png'
      : contentType.includes('webp') ? '.webp'
      : '.jpg';
    const filename = `receipt-${randomUUID()}${ext}`;
    const uploadDir = '/shared-storage/public/assets/receipts';
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    await fs.promises.writeFile(filePath, Buffer.concat(chunks));
    return res.status(201).json({ url: `/airo-assets/uploads/receipts/${filename}` });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed', message: String(error) });
  }
}
