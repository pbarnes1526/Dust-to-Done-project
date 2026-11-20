import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffEstimates } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });
    const { materialSubtotal, wasteAllowance, laborCost, laborNotes, salesTaxRate, salesTax, markupPercent, markupAmount, totalEstimate, notes } = req.body;
    const existing = await db.select().from(takeoffEstimates).where(eq(takeoffEstimates.projectId, projectId)).limit(1);
    if (existing.length === 0) {
      await db.insert(takeoffEstimates).values({ projectId, materialSubtotal, wasteAllowance, laborCost, laborNotes, salesTaxRate, salesTax, markupPercent, markupAmount, totalEstimate, notes });
    } else {
      await db.update(takeoffEstimates).set({ materialSubtotal, wasteAllowance, laborCost, laborNotes, salesTaxRate, salesTax, markupPercent, markupAmount, totalEstimate, notes }).where(eq(takeoffEstimates.projectId, projectId));
    }
    const [est] = await db.select().from(takeoffEstimates).where(eq(takeoffEstimates.projectId, projectId)).limit(1);
    return res.json(est);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update estimate', message: String(error) });
  }
}
