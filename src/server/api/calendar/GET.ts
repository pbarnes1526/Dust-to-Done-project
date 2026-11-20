import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { calendarEvents, jobs, employees } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const rows = await db.select({ event: calendarEvents, job: jobs, employee: employees })
      .from(calendarEvents)
      .leftJoin(jobs, eq(calendarEvents.jobId, jobs.id))
      .leftJoin(employees, eq(calendarEvents.assignedEmployeeId, employees.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
