import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);

    // Parse multipart boundary
    const contentType = req.headers['content-type'] ?? '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) return res.status(400).json({ error: 'No boundary found' });
    const boundary = boundaryMatch[1].trim();

    const delimiter = Buffer.from('--' + boundary);
    const parts: { headers: string; data: Buffer }[] = [];
    let pos = 0;
    while (pos < body.length) {
      const delimIdx = body.indexOf(delimiter, pos);
      if (delimIdx === -1) break;
      pos = delimIdx + delimiter.length;
      if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break; // --boundary--
      if (body[pos] === 0x0d) pos += 2; // CRLF
      const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos);
      if (headerEnd === -1) break;
      const headers = body.slice(pos, headerEnd).toString();
      pos = headerEnd + 4;
      const nextDelim = body.indexOf(delimiter, pos);
      const dataEnd = nextDelim === -1 ? body.length : nextDelim - 2; // strip trailing CRLF
      parts.push({ headers, data: body.slice(pos, dataEnd) });
      pos = nextDelim === -1 ? body.length : nextDelim;
    }

    const filePart = parts.find(p => p.headers.includes('filename='));
    if (!filePart) return res.status(400).json({ error: 'No file part found' });

    const nameMatch = filePart.headers.match(/filename="([^"]+)"/);
    const originalName = nameMatch ? nameMatch[1] : 'upload';
    const ext = path.extname(originalName);
    const uuid = randomUUID();
    const filename = `${uuid}${ext}`;

    const uploadDir = '/shared-storage/public/assets/uploads/documents';
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), filePart.data);

    const contentTypeMatch = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

    return res.status(201).json({
      url: `/airo-assets/uploads/documents/${filename}`,
      originalName,
      mimeType,
      size: filePart.data.length,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed', message: String(error) });
  }
}
