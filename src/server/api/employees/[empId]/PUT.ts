import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { employees } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ empId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.empId);
    const { name, type, phone, email, specialty, hourlyRate, notes, availability, isActive } = req.body;
    await db.update(employees).set({ name, type, phone, email, specialty, hourlyRate, notes, availability, isActive }).where(eq(employees.id, id));
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee', message: String(err) });
  }
}
