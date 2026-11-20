import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../../../../db/client.js';
import { estimates, estimateLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { sendEmail } from '@/server/email';

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const [est] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    if (!est) return res.status(404).json({ error: 'Estimate not found' });

    const toEmail = (req.body as { email?: string }).email ?? est.clientEmail;
    if (!toEmail) return res.status(400).json({ error: 'No recipient email address' });

    // Generate a view token if one doesn't exist yet
    let viewToken = est.viewToken;
    if (!viewToken) {
      viewToken = randomBytes(32).toString('hex');
      await db.update(estimates).set({ viewToken, status: 'sent' }).where(eq(estimates.id, id));
    } else {
      await db.update(estimates).set({ status: 'sent' }).where(eq(estimates.id, id));
    }

    const lineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id))
      .orderBy(asc(estimateLineItems.sortOrder));

    const fmtCur = (v: string | number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

    const lineItemRows = lineItems
      .map(li => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${li.description}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${li.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCur(li.unitPrice)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCur(Number(li.quantity) * Number(li.unitPrice))}</td>
      </tr>`)
      .join('');

    const validUntilRow = est.validUntil
      ? `<tr><td style="padding:6px 0;color:#6b7280;width:140px;">Valid Until</td><td style="padding:6px 0;font-weight:600;">${est.validUntil}</td></tr>`
      : '';

    const originHeader = req.headers.origin;
    const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader)
      ?? `${req.protocol}://${req.headers.host}`;

    const viewUrl = `${origin}/estimate/${viewToken}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <div style="background:#B22234;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Estimate from Dust to Done</h1>
        </div>
        <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hi ${est.clientName},</p>
          <p style="margin:0 0 20px;">Please find your estimate details below. You can review and accept it online using the button below.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:6px 0;color:#6b7280;width:140px;">Estimate #</td>
              <td style="padding:6px 0;font-weight:600;">${est.estimateNumber}</td>
            </tr>
            ${est.projectDescription ? `<tr><td style="padding:6px 0;color:#6b7280;">Project</td><td style="padding:6px 0;">${est.projectDescription}</td></tr>` : ''}
            ${validUntilRow}
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Total</td>
              <td style="padding:6px 0;font-weight:700;font-size:18px;color:#B22234;">${fmtCur(est.total)}</td>
            </tr>
          </table>

          ${lineItems.length > 0 ? `
          <h3 style="margin:0 0 10px;font-size:14px;color:#374151;border-bottom:2px solid #B22234;padding-bottom:6px;">Scope of Work</h3>
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

          ${est.notes ? `<p style="margin:0 0 20px;font-size:13px;color:#6b7280;"><strong>Notes:</strong> ${est.notes}</p>` : ''}

          <div style="text-align:center;margin:28px 0 12px;">
            <a href="${viewUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;">Review &amp; Accept Estimate</a>
          </div>
          <p style="text-align:center;margin:0 0 20px;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${viewUrl}" style="color:#B22234;">${viewUrl}</a></p>

          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Dust to Done Renovation Solutions LLC</p>
        </div>
      </div>`;

    const text = `Estimate from Dust to Done\n\nEstimate: ${est.estimateNumber}\nClient: ${est.clientName}\nTotal: ${fmtCur(est.total)}\n${est.projectDescription ? `Project: ${est.projectDescription}\n` : ''}${est.validUntil ? `Valid Until: ${est.validUntil}\n` : ''}${est.notes ? `Notes: ${est.notes}\n` : ''}\nReview & Accept: ${viewUrl}`;

    await sendEmail({
      fromName: 'Dust to Done',
      to: toEmail,
      subject: `Estimate ${est.estimateNumber} from Dust to Done`,
      html,
      text,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('send estimate email error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
