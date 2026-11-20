import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { contracts } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const {
      jobId, contractNumber, status, clientName, clientEmail, clientPhone, clientAddress,
      contractorName, contractorLicense, contractorPhone, contractorEmail, contractorAddress,
      projectAddress, projectDescription, scopeOfWork,
      contractAmount, depositAmount, depositDueDate, paymentSchedule,
      startDate, estimatedEndDate, signedDate,
      warrantyPeriod, terms, notes, clientSignature, contractorSignature,
    } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'clientName is required' });
    }

    const [result] = await db.insert(contracts).values({
      jobId: jobId || null,
      contractNumber: contractNumber || null,
      status: status || 'draft',
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      clientAddress: clientAddress || null,
      contractorName: contractorName || null,
      contractorLicense: contractorLicense || null,
      contractorPhone: contractorPhone || null,
      contractorEmail: contractorEmail || null,
      contractorAddress: contractorAddress || null,
      projectAddress: projectAddress || null,
      projectDescription: projectDescription || null,
      scopeOfWork: scopeOfWork || null,
      contractAmount: contractAmount || '0',
      depositAmount: depositAmount || '0',
      depositDueDate: depositDueDate || null,
      paymentSchedule: paymentSchedule || null,
      startDate: startDate || null,
      estimatedEndDate: estimatedEndDate || null,
      signedDate: signedDate || null,
      warrantyPeriod: warrantyPeriod || null,
      terms: terms || null,
      notes: notes || null,
      clientSignature: clientSignature || null,
      contractorSignature: contractorSignature || null,
    });

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create contract', message: String(err) });
  }
}
