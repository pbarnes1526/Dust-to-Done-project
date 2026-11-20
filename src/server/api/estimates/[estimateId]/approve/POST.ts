import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { estimates, estimateLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { sendEmail } from '@/server/email';
import { getSecret } from '#airo/secrets';

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

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    // Fetch the estimate
    const [est] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    if (!est) return res.status(404).json({ error: 'Estimate not found' });

    // Update status to approved
    await db.update(estimates).set({ status: 'approved' }).where(eq(estimates.id, id));

    // Fetch line items for the email
    const lineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id))
      .orderBy(asc(estimateLineItems.sortOrder));

    // Send notification email
    const recipient = getSecret('NOTIFICATION_RECIPIENT_EMAIL');
    if (typeof recipient === 'string' && recipient.length > 0) {
      const fmtCur = (v: string | number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

      const lineItemRows = lineItems
        .map(
          li =>
            `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${li.description}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${li.quantity}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCur(li.unitPrice)}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCur(Number(li.quantity) * Number(li.unitPrice))}</td>
            </tr>`
        )
        .join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:#f59e0b;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Estimate Approved</h1>
          </div>
          <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 16px;">An estimate has been marked as <strong>Approved</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;width:140px;">Estimate #</td>
                <td style="padding:6px 0;font-weight:600;">${est.estimateNumber}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;">Client</td>
                <td style="padding:6px 0;font-weight:600;">${est.clientName}</td>
              </tr>
              ${est.clientEmail ? `<tr><td style="padding:6px 0;color:#6b7280;">Client Email</td><td style="padding:6px 0;">${est.clientEmail}</td></tr>` : ''}
              ${est.clientPhone ? `<tr><td style="padding:6px 0;color:#6b7280;">Client Phone</td><td style="padding:6px 0;">${est.clientPhone}</td></tr>` : ''}
              <tr>
                <td style="padding:6px 0;color:#6b7280;">Total</td>
                <td style="padding:6px 0;font-weight:700;font-size:18px;color:#f59e0b;">${fmtCur(est.total)}</td>
              </tr>
            </table>

            ${lineItems.length > 0 ? `
            <h3 style="margin:0 0 10px;font-size:14px;color:#374151;border-bottom:2px solid #f59e0b;padding-bottom:6px;">Line Items</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600;">Description</th>
                  <th style="padding:6px 8px;text-align:center;color:#6b7280;font-weight:600;">Qty</th>
                  <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600;">Unit Price</th>
                  <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600;">Total</th>
                </tr>
              </thead>
              <tbody>${lineItemRows}</tbody>
            </table>` : ''}

            ${est.projectDescription ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;"><strong>Project:</strong> ${est.projectDescription}</p>` : ''}
            ${est.notes ? `<p style="margin:0;font-size:13px;color:#6b7280;"><strong>Notes:</strong> ${est.notes}</p>` : ''}
          </div>
        </div>`;

      const text = `Estimate Approved\n\nEstimate: ${est.estimateNumber}\nClient: ${est.clientName}\nTotal: ${fmtCur(est.total)}\n${est.projectDescription ? `Project: ${est.projectDescription}\n` : ''}`;

      try {
        await sendEmail({
          fromName: 'Dust to Done',
          to: recipient,
          subject: `Estimate Approved — ${est.estimateNumber} (${est.clientName})`,
          html,
          text,
        });
      } catch (emailErr) {
        console.error('email.send.failed', { kind: sendFailureKind(emailErr) });
        // Don't fail the approval if email fails
      }
    }

    const updated = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    const updatedLineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id))
      .orderBy(asc(estimateLineItems.sortOrder));

    return res.json({ ...updated[0], lineItems: updatedLineItems });
  } catch (error) {
    console.error('approve estimate error:', error);
    return res.status(500).json({ error: 'Failed to approve estimate' });
  }
}
