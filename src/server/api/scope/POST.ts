import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { scopeProjects, scopeCostSummary, companySettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { projectName, customerName, customerEmail, customerPhone, jobAddress, description, dimensions, specialInstructions, linkedJobId } = req.body as {
      projectName: string; customerName: string; customerEmail?: string; customerPhone?: string;
      jobAddress?: string; description?: string; dimensions?: string; specialInstructions?: string; linkedJobId?: number;
    };
    if (!projectName || !customerName) return res.status(400).json({ error: 'projectName and customerName are required' });

    const [inserted] = await db.insert(scopeProjects).values({
      projectName, customerName, customerEmail: customerEmail ?? null,
      customerPhone: customerPhone ?? null, jobAddress: jobAddress ?? null,
      description: description ?? null, dimensions: dimensions ?? null,
      specialInstructions: specialInstructions ?? null,
      linkedJobId: linkedJobId ?? null,
    }).$returningId();

    const projectId = inserted.id;

    // Pull default overhead/profit from company settings if available
    const [settings] = await db.select().from(companySettings).limit(1);
    const overheadPct = settings?.defaultOverheadPct ?? '15';
    const profitPct = settings?.defaultProfitPct ?? '20';

    await db.insert(scopeCostSummary).values({
      projectId,
      overheadPct: String(overheadPct),
      profitPct: String(profitPct),
    });

    const [project] = await db.select().from(scopeProjects).where(eq(scopeProjects.id, projectId)).limit(1);
    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create scope project', message: String(error) });
  }
}
