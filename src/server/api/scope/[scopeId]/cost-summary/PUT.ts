import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeCostSummary, scopeProjects } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    const {
      materialCost, wasteAllowance, laborCost, subcontractorCost, equipmentRental,
      deliveryCharges, disposalCost, permitAllowance, miscExpenses, overheadPct, profitPct,
    } = req.body as Record<string, string | number>;

    const mc = Number(materialCost) || 0;
    const wa = Number(wasteAllowance) || 0;
    const lc = Number(laborCost) || 0;
    const sc = Number(subcontractorCost) || 0;
    const er = Number(equipmentRental) || 0;
    const dc = Number(deliveryCharges) || 0;
    const disp = Number(disposalCost) || 0;
    const pa = Number(permitAllowance) || 0;
    const misc = Number(miscExpenses) || 0;
    const ohPct = Number(overheadPct) || 15;
    const prPct = Number(profitPct) || 20;

    const totalDirect = mc + wa + lc + sc + er + dc + disp + pa + misc;
    const overhead = totalDirect * (ohPct / 100);
    const profitBase = totalDirect + overhead;
    const profitMargin = profitBase * (prPct / 100);
    const sellingPrice = profitBase + profitMargin;
    const grossProfit = sellingPrice - totalDirect;
    const grossProfitPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    const round = (n: number) => Math.round(n * 100) / 100;

    await db.update(scopeCostSummary).set({
      materialCost: String(round(mc)),
      wasteAllowance: String(round(wa)),
      laborCost: String(round(lc)),
      subcontractorCost: String(round(sc)),
      equipmentRental: String(round(er)),
      deliveryCharges: String(round(dc)),
      disposalCost: String(round(disp)),
      permitAllowance: String(round(pa)),
      miscExpenses: String(round(misc)),
      totalDirectCost: String(round(totalDirect)),
      overheadPct: String(round(ohPct)),
      overhead: String(round(overhead)),
      profitPct: String(round(prPct)),
      profitMargin: String(round(profitMargin)),
      sellingPrice: String(round(sellingPrice)),
      grossProfit: String(round(grossProfit)),
      grossProfitPct: String(round(grossProfitPct)),
    }).where(eq(scopeCostSummary.projectId, projectId));

    // Also update selling price on the project record
    await db.update(scopeProjects).set({ sellingPrice: String(round(sellingPrice)) }).where(eq(scopeProjects.id, projectId));

    const [updated] = await db.select().from(scopeCostSummary).where(eq(scopeCostSummary.projectId, projectId)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update cost summary', message: String(error) });
  }
}
