import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { jobAssignments } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { createNotification } from '../../../../lib/notify.js';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const { employeeId, role, scheduledHours, actualHours, startDate, endDate, notes } = req.body;
    const [result] = await db.insert(jobAssignments).values({ jobId, employeeId, role, scheduledHours, actualHours, startDate, endDate, notes });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(jobAssignments).where(eq(jobAssignments.id, id));
    await createNotification('employee_assignment', 'Worker Assigned', 'Worker assigned to job #' + jobId + (role ? ' as ' + role : ''), jobId);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
