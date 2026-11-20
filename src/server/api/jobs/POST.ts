import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { jobs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, clientName, clientEmail, clientPhone, address, status, budget, startDate, endDate, notes } = req.body;
    if (!name || !clientName) {
      return res.status(400).json({ error: 'name and clientName are required' });
    }
    const result = await db.insert(jobs).values({ name, clientName, clientEmail, clientPhone, address, status: status ?? 'pending', budget, startDate, endDate, notes });
    const insertId = Number(result[0].insertId);
    const [newJob] = await db.select().from(jobs).where(eq(jobs.id, insertId)).limit(1);
    return res.status(201).json(newJob);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create job', message: String(error) });
  }
}
