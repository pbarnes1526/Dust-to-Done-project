import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { contracts } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email';

type SendFailureKind =
  | 'gateway-unreachable'
  | 'gateway-rejected'
  | 'gateway-error'
  | 'no-message-id'
  | 'unknown';

function sendFailureKind(error: unknown): SendFailureKind {
  const message: string = error instanceof Error ? error.message : '';
  if (message.startsWith('email gateway unreachable')) return 'gateway-unreachable';
  if (message.startsWith('email send succeeded')) return 'no-message-id';
  if (message.startsWith('email send failed: refused')) return 'gateway-rejected';
  if (message.startsWith('email send failed: HTTP 5')) return 'gateway-error';
  if (message.startsWith('email send failed: non-JSON response')) return 'gateway-error';
  if (message.startsWith('email send failed:')) return 'gateway-rejected';
  if (message.startsWith('email send failed')) return 'gateway-error';
  return 'unknown';
}

export default async function handler(req: Request<{ contractId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.contractId, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });

    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const toEmail = (req.body as { email?: string }).email ?? contract.clientEmail;
    if (!toEmail) return res.status(400).json({ error: 'No recipient email address. Please add a client email to the contract.' });

    const fmtCur = (v: string | number | null) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v ?? 0));

    const row = (label: string, value: string | null | undefined) =>
      value
        ? `<tr><td style="padding:5px 0;color:#6b7280;width:160px;vertical-align:top;">${label}</td><td style="padding:5px 0;font-weight:500;">${value}</td></tr>`
        : '';

    const scopeSection = contract.scopeOfWork
      ? `<div style="margin:20px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Scope of Work</h3>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${contract.scopeOfWork}</div>
        </div>`
      : '';

    const paymentSection = contract.paymentSchedule
      ? `<div style="margin:20px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Payment Schedule</h3>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${contract.paymentSchedule}</div>
        </div>`
      : '';

    const termsSection = contract.terms
      ? `<div style="margin:20px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Terms &amp; Conditions</h3>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:13px;line-height:1.6;color:#374151;">${contract.terms}</div>
        </div>`
      : '';

    const contractorSection = (contract.contractorName || contract.contractorPhone || contract.contractorEmail)
      ? `<div style="margin:20px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Contractor</h3>
          <table style="width:100%;border-collapse:collapse;">
            ${row('Name', contract.contractorName)}
            ${row('License', contract.contractorLicense)}
            ${row('Phone', contract.contractorPhone)}
            ${row('Email', contract.contractorEmail)}
            ${row('Address', contract.contractorAddress)}
          </table>
        </div>`
      : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

    <div style="background:#1a1a1a;padding:28px 32px;">
      <h1 style="margin:0 0 4px;color:#f59e0b;font-size:22px;font-weight:700;">Dust to Done</h1>
      <p style="margin:0;color:#9ca3af;font-size:14px;">Renovation Contract</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;">Hi ${contract.clientName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;">
        Please review the contract details below. Once you have reviewed everything, please reply to this email or contact us to confirm your acceptance and arrange for signatures.
      </p>

      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row('Contract #', contract.contractNumber)}
          ${row('Project Address', contract.projectAddress)}
          ${row('Start Date', contract.startDate)}
          ${row('Est. Completion', contract.estimatedEndDate)}
          ${row('Contract Amount', fmtCur(contract.contractAmount))}
          ${row('Deposit Due', contract.depositAmount && contract.depositAmount !== '0' ? `${fmtCur(contract.depositAmount)}${contract.depositDueDate ? ` by ${contract.depositDueDate}` : ''}` : null)}
          ${row('Warranty', contract.warrantyPeriod)}
        </table>
      </div>

      ${contract.projectDescription ? `<div style="margin:0 0 20px;"><h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Project Description</h3><p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${contract.projectDescription}</p></div>` : ''}

      ${scopeSection}
      ${paymentSection}
      ${contractorSection}
      ${termsSection}

      ${contract.notes ? `<div style="margin:20px 0;padding:14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;"><strong style="font-size:13px;">Notes:</strong><p style="margin:6px 0 0;font-size:13px;color:#374151;">${contract.notes}</p></div>` : ''}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
        <p style="margin:0 0 4px;">Questions? Contact us:</p>
        ${contract.contractorPhone ? `<p style="margin:0 0 2px;">Phone: ${contract.contractorPhone}</p>` : ''}
        ${contract.contractorEmail ? `<p style="margin:0;">Email: ${contract.contractorEmail}</p>` : ''}
      </div>
    </div>

  </div>
</body>
</html>`;

    try {
      await sendEmail({
        fromName: 'Dust to Done',
        to: toEmail,
        subject: `Contract${contract.contractNumber ? ` #${contract.contractNumber}` : ''} from Dust to Done${contract.projectAddress ? ` — ${contract.projectAddress}` : ''}`,
        html,
        text: `Hi ${contract.clientName},\n\nPlease review your renovation contract from Dust to Done.\n\nContract Amount: ${fmtCur(contract.contractAmount)}\nProject Address: ${contract.projectAddress ?? ''}\nStart Date: ${contract.startDate ?? ''}\n\nPlease reply to confirm acceptance.\n\n${contract.contractorPhone ? `Phone: ${contract.contractorPhone}` : ''}\n${contract.contractorEmail ? `Email: ${contract.contractorEmail}` : ''}`,
      });
    } catch (emailErr) {
      console.error('email.send.failed', { kind: sendFailureKind(emailErr) });
      return res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }

    // Mark contract as sent if it was draft
    if (contract.status === 'draft') {
      await db.update(contracts).set({ status: 'sent' }).where(eq(contracts.id, id));
    }

    res.json({ ok: true, sentTo: toEmail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send contract', message: String(err) });
  }
}
