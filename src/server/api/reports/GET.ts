import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { jobs, expenses, invoices, estimates } from '../../db/schema.js';
import { sql } from 'drizzle-orm';

export interface JobCostReport {
  jobId: number;
  jobName: string;
  clientName: string;
  status: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  // Expenses
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  // Invoices
  totalInvoiced: number;
  totalPaid: number;
  invoiceCount: number;
  // Estimates
  totalEstimated: number;
  estimateCount: number;
  // Derived
  budgetUsedPct: number;
  grossProfit: number;
  grossMarginPct: number;
}

export default async function handler(_req: Request, res: Response) {
  try {
    const allJobs = await db.select().from(jobs);

    // Aggregate expenses per job + category
    const expRows = await db
      .select({
        jobId: expenses.jobId,
        category: expenses.category,
        total: sql<string>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .groupBy(expenses.jobId, expenses.category);

    // Aggregate invoices per job
    const invRows = await db
      .select({
        jobId: invoices.jobId,
        subtotal: sql<string>`SUM(${invoices.subtotal})`,
        tax: sql<string>`SUM(${invoices.tax})`,
        paidTotal: sql<string>`SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .groupBy(invoices.jobId);

    // Aggregate estimates per job
    const estRows = await db
      .select({
        jobId: estimates.jobId,
        total: sql<string>`SUM(${estimates.total})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(estimates)
      .groupBy(estimates.jobId);

    const reports: JobCostReport[] = allJobs.map(job => {
      const jobExpenses = expRows.filter(r => r.jobId === job.id);
      const expensesByCategory: Record<string, number> = {};
      let totalExpenses = 0;
      for (const row of jobExpenses) {
        const amt = Number(row.total);
        expensesByCategory[row.category] = amt;
        totalExpenses += amt;
      }

      const invRow = invRows.find(r => r.jobId === job.id);
      const totalInvoiced = invRow ? Number(invRow.subtotal) + Number(invRow.tax) : 0;
      const totalPaid = invRow ? Number(invRow.paidTotal) : 0;
      const invoiceCount = invRow ? Number(invRow.count) : 0;

      const estRow = estRows.find(r => r.jobId === job.id);
      const totalEstimated = estRow ? Number(estRow.total) : 0;
      const estimateCount = estRow ? Number(estRow.count) : 0;

      const budget = Number(job.budget ?? 0);
      const budgetUsedPct = budget > 0 ? Math.min((totalExpenses / budget) * 100, 999) : 0;
      const grossProfit = totalPaid - totalExpenses;
      const grossMarginPct = totalPaid > 0 ? (grossProfit / totalPaid) * 100 : 0;

      return {
        jobId: job.id,
        jobName: job.name,
        clientName: job.clientName,
        status: job.status,
        budget,
        startDate: job.startDate ?? null,
        endDate: job.endDate ?? null,
        totalExpenses,
        expensesByCategory,
        totalInvoiced,
        totalPaid,
        invoiceCount,
        totalEstimated,
        estimateCount,
        budgetUsedPct,
        grossProfit,
        grossMarginPct,
      };
    });

    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate reports', message: String(error) });
  }
}
