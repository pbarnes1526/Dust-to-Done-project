import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { employees, jobAssignments, jobs } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ empId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.empId);
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    if (!emp) return res.status(404).json({ error: 'Not found' });
    const assignments = await db.select({ assignment: jobAssignments, job: jobs })
      .from(jobAssignments)
      .leftJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(eq(jobAssignments.employeeId, id));
    res.json({ ...emp, assignments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee', message: String(err) });
  }
}
