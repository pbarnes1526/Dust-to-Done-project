import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req: Request, res: Response) {
  try {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are accepted' });
    }
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg';
    const filename = `estimate-${Date.now()}.${ext}`;
    const uploadDir = '/shared-storage/public/assets/uploads/estimate-photos';
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const chunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer>) chunks.push(chunk);
    await fs.writeFile(filePath, Buffer.concat(chunks));
    return res.json({ url: `/airo-assets/uploads/estimate-photos/${filename}` });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed', message: String(error) });
  }
}
