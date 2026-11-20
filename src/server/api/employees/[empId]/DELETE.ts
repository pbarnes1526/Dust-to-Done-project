import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { employees, jobAssignments, calendarEvents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ empId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.empId);
    // Remove FK-dependent rows first
    await db.update(calendarEvents).set({ assignedEmployeeId: null }).where(eq(calendarEvents.assignedEmployeeId, id));
    await db.delete(jobAssignments).where(eq(jobAssignments.employeeId, id));
    await db.delete(employees).where(eq(employees.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee', message: String(err) });
  }
}
