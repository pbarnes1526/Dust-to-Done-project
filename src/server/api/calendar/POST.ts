import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { calendarEvents } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { createNotification } from '../../lib/notify.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, title, type, eventDate, endDate, startTime, endTime, description, assignedEmployeeId } = req.body;
    if (!title || !eventDate) return res.status(400).json({ error: 'title and eventDate required' });
    const [result] = await db.insert(calendarEvents).values({ jobId, title, type: type || 'other', eventDate, endDate, startTime, endTime, description, assignedEmployeeId });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    if (type === 'inspection') {
      await createNotification('inspection_deadline', 'Inspection Scheduled', title + ' scheduled for ' + eventDate, jobId || null);
    } else if (type === 'job_start') {
      await createNotification('upcoming_job', 'Job Starting', title + ' starts on ' + eventDate, jobId || null);
    } else if (type === 'delivery') {
      await createNotification('material_delivery', 'Delivery Scheduled', title + ' scheduled for ' + eventDate, jobId || null);
    }
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
