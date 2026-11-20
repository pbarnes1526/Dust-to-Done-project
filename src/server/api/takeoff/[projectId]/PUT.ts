import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { takeoffProjects } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const id = Number(req.params.projectId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid projectId' });
    const { projectName, customerName, customerEmail, customerPhone, address, description, dimensions, notes, status, linkedJobId } = req.body;
    await db.update(takeoffProjects).set({ projectName, customerName, customerEmail, customerPhone, address, description, dimensions, notes, status, linkedJobId }).where(eq(takeoffProjects.id, id));
    const [updated] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update project', message: String(error) });
  }
}
