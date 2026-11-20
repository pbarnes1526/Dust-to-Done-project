import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { employees } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, type, phone, email, specialty, hourlyRate, notes, availability } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const [result] = await db.insert(employees).values({ name, type: type || 'employee', phone, email, specialty, hourlyRate, notes, availability });
    const id = (result as { insertId: number }).insertId;
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    res.status(201).json(emp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create employee', message: String(err) });
  }
}
