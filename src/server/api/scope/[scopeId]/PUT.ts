import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { scopeProjects } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const id = Number(req.params.scopeId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid scopeId' });

    const {
      projectName, customerName, customerEmail, customerPhone, jobAddress,
      description, dimensions, specialInstructions, status, linkedJobId, linkedTakeoffId,
      proposalPaymentSchedule, proposalDuration, proposalWarranty, proposalExclusions, proposalNotes, sellingPrice,
    } = req.body as Record<string, string | number | null | undefined>;

    await db.update(scopeProjects).set({
      ...(projectName !== undefined && { projectName: String(projectName) }),
      ...(customerName !== undefined && { customerName: String(customerName) }),
      ...(customerEmail !== undefined && { customerEmail: customerEmail ? String(customerEmail) : null }),
      ...(customerPhone !== undefined && { customerPhone: customerPhone ? String(customerPhone) : null }),
      ...(jobAddress !== undefined && { jobAddress: jobAddress ? String(jobAddress) : null }),
      ...(description !== undefined && { description: description ? String(description) : null }),
      ...(dimensions !== undefined && { dimensions: dimensions ? String(dimensions) : null }),
      ...(specialInstructions !== undefined && { specialInstructions: specialInstructions ? String(specialInstructions) : null }),
      ...(status !== undefined && { status: status as 'estimating' | 'proposal_sent' | 'approved' | 'in_progress' | 'completed' | 'declined' }),
      ...(linkedJobId !== undefined && { linkedJobId: linkedJobId ? Number(linkedJobId) : null }),
      ...(linkedTakeoffId !== undefined && { linkedTakeoffId: linkedTakeoffId ? Number(linkedTakeoffId) : null }),
      ...(proposalPaymentSchedule !== undefined && { proposalPaymentSchedule: proposalPaymentSchedule ? String(proposalPaymentSchedule) : null }),
      ...(proposalDuration !== undefined && { proposalDuration: proposalDuration ? String(proposalDuration) : null }),
      ...(proposalWarranty !== undefined && { proposalWarranty: proposalWarranty ? String(proposalWarranty) : null }),
      ...(proposalExclusions !== undefined && { proposalExclusions: proposalExclusions ? String(proposalExclusions) : null }),
      ...(proposalNotes !== undefined && { proposalNotes: proposalNotes ? String(proposalNotes) : null }),
      ...(sellingPrice !== undefined && { sellingPrice: sellingPrice ? String(sellingPrice) : null }),
    }).where(eq(scopeProjects.id, id));

    const [updated] = await db.select().from(scopeProjects).where(eq(scopeProjects.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update scope project', message: String(error) });
  }
}
