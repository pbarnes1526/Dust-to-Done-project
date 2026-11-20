import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffProjects, takeoffMaterials, takeoffEstimates } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });
    const [project] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, projectId)).limit(1);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const materials = await db.select().from(takeoffMaterials).where(eq(takeoffMaterials.projectId, projectId)).orderBy(asc(takeoffMaterials.sortOrder), asc(takeoffMaterials.id));
    const [estimate] = await db.select().from(takeoffEstimates).where(eq(takeoffEstimates.projectId, projectId)).limit(1);

    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const rows: string[] = [];
    rows.push('Dust to Done Renovation Solutions LLC - Material Takeoff');
    rows.push(`Project:,${esc(project.projectName)}`);
    rows.push(`Customer:,${esc(project.customerName)}`);
    rows.push(`Address:,${esc(project.address)}`);
    rows.push(`Date:,${new Date().toLocaleDateString()}`);
    rows.push('');
    rows.push('Category,Material Name,Description,Qty,Unit,Unit Price,Waste %,Extended Price,Supplier,Product Info,Product Link,Price Source,Price Date,AI Generated');
    for (const m of materials) {
      rows.push([
        esc(m.category), esc(m.name), esc(m.description), esc(m.quantity), esc(m.unit),
        esc(m.unitPrice), esc(m.wastePercent), esc(m.extendedPrice),
        esc(m.supplier), esc(m.productInfo), esc(m.productLink), esc(m.priceSource), esc(m.priceDate),
        m.aiGenerated ? 'Yes' : 'No',
      ].join(','));
    }
    rows.push('');
    if (estimate) {
      rows.push(`Material Subtotal:,${esc(estimate.materialSubtotal)}`);
      rows.push(`Waste Allowance:,${esc(estimate.wasteAllowance)}`);
      rows.push(`Labor Cost:,${esc(estimate.laborCost)}`);
      rows.push(`Sales Tax (${estimate.salesTaxRate}%):,${esc(estimate.salesTax)}`);
      rows.push(`Markup (${estimate.markupPercent}%):,${esc(estimate.markupAmount)}`);
      rows.push(`TOTAL ESTIMATE:,${esc(estimate.totalEstimate)}`);
    }

    const csv = rows.join('\r\n');
    const filename = `takeoff-${project.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: 'Export failed', message: String(error) });
  }
}
