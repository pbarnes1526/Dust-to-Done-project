import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { jobMaterials } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ error: 'Invalid jobId' });
    const { description, quantity, unit, estimatedCost, status, vendor, notes } = req.body as {
      description: string; quantity?: string; unit?: string; estimatedCost?: string;
      status?: 'needed' | 'ordered' | 'received'; vendor?: string; notes?: string;
    };
    if (!description) return res.status(400).json({ error: 'Description is required' });
    const [result] = await db.insert(jobMaterials).values({
      jobId,
      description,
      quantity: quantity ?? '1',
      unit: unit ?? 'ea',
      estimatedCost: estimatedCost ?? null,
      status: status ?? 'needed',
      vendor: vendor ?? null,
      notes: notes ?? null,
    });
    const [created] = await db.select().from(jobMaterials).where(eq(jobMaterials.id, result.insertId)).limit(1);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create material', message: String(error) });
  }
}
