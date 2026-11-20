import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { scopeProjects, scopeCostSummary } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const projects = await db.select().from(scopeProjects).orderBy(scopeProjects.createdAt);
    // Attach selling price from cost summary if not set on project
    const withCosts = await Promise.all(projects.map(async (p) => {
      const [cs] = await db.select().from(scopeCostSummary).where(eq(scopeCostSummary.projectId, p.id)).limit(1);
      return { ...p, costSummary: cs ?? null };
    }));
    return res.json(withCosts);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch scope projects', message: String(error) });
  }
}
