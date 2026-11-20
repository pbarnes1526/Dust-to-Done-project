import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { contracts } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ contractId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.contractId, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });

    const {
      jobId, contractNumber, status, clientName, clientEmail, clientPhone, clientAddress,
      contractorName, contractorLicense, contractorPhone, contractorEmail, contractorAddress,
      projectAddress, projectDescription, scopeOfWork,
      contractAmount, depositAmount, depositDueDate, paymentSchedule,
      startDate, estimatedEndDate, signedDate,
      warrantyPeriod, terms, notes, clientSignature, contractorSignature,
    } = req.body;

    await db.update(contracts).set({
      jobId: jobId ?? null,
      contractNumber: contractNumber ?? null,
      status: status ?? 'draft',
      clientName,
      clientEmail: clientEmail ?? null,
      clientPhone: clientPhone ?? null,
      clientAddress: clientAddress ?? null,
      contractorName: contractorName ?? null,
      contractorLicense: contractorLicense ?? null,
      contractorPhone: contractorPhone ?? null,
      contractorEmail: contractorEmail ?? null,
      contractorAddress: contractorAddress ?? null,
      projectAddress: projectAddress ?? null,
      projectDescription: projectDescription ?? null,
      scopeOfWork: scopeOfWork ?? null,
      contractAmount: contractAmount ?? '0',
      depositAmount: depositAmount ?? '0',
      depositDueDate: depositDueDate ?? null,
      paymentSchedule: paymentSchedule ?? null,
      startDate: startDate ?? null,
      estimatedEndDate: estimatedEndDate ?? null,
      signedDate: signedDate ?? null,
      warrantyPeriod: warrantyPeriod ?? null,
      terms: terms ?? null,
      notes: notes ?? null,
      clientSignature: clientSignature ?? null,
      contractorSignature: contractorSignature ?? null,
    }).where(eq(contracts.id, id));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contract', message: String(err) });
  }
}
