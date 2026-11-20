import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { jobAssignments, employees } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ jobId: string }>, res: Response) {
  try {
    const jobId = parseInt(req.params.jobId);
    const rows = await db.select({ assignment: jobAssignments, employee: employees })
      .from(jobAssignments)
      .leftJoin(employees, eq(jobAssignments.employeeId, employees.id))
      .where(eq(jobAssignments.jobId, jobId));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
