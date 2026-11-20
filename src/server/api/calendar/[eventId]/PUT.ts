import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { calendarEvents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ eventId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.eventId);
    const { jobId, title, type, eventDate, endDate, startTime, endTime, description, assignedEmployeeId } = req.body;
    await db.update(calendarEvents).set({ jobId, title, type, eventDate, endDate, startTime, endTime, description, assignedEmployeeId }).where(eq(calendarEvents.id, id));
    const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
