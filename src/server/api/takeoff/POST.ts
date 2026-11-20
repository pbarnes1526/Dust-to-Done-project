import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { takeoffProjects, takeoffEstimates } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { projectName, customerName, customerEmail, customerPhone, address, description, dimensions, notes, linkedJobId } = req.body as {
      projectName: string; customerName: string; customerEmail?: string; customerPhone?: string;
      address?: string; description?: string; dimensions?: string; notes?: string; linkedJobId?: number;
    };
    if (!projectName || !customerName) return res.status(400).json({ error: 'projectName and customerName required' });
    const [result] = await db.insert(takeoffProjects).values({ projectName, customerName, customerEmail, customerPhone, address, description, dimensions, notes, linkedJobId });
    const id = result.insertId;
    // seed estimate row
    await db.insert(takeoffEstimates).values({ projectId: id });
    const [project] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, id)).limit(1);
    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create project', message: String(error) });
  }
}
