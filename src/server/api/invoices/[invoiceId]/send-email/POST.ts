import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../../../../db/client.js';
import { invoices, invoiceLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { sendEmail } from '@/server/email';

export default async function handler(req: Request<{ invoiceId: string }>, res: Response) {
  try {
    const id = Number(req.params.invoiceId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const toEmail = (req.body as { email?: string }).email ?? inv.clientEmail;
    if (!toEmail) return res.status(400).json({ error: 'No recipient email address' });

    // Generate a view token if one doesn't exist yet
    // Do not change status when invoice is already paid
    let viewToken = inv.viewToken;
    const alreadyPaid = inv.status === 'paid';
    if (!viewToken) {
      viewToken = randomBytes(32).toString('hex');
      await db.update(invoices)
        .set({ viewToken, ...(alreadyPaid ? {} : { status: 'sent' }) })
        .where(eq(invoices.id, id));
    } else if (!alreadyPaid) {
      await db.update(invoices).set({ status: 'sent' }).where(eq(invoices.id, id));
    }

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(asc(invoiceLineItems.id));

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

    const dueDateRow = inv.dueDate
      ? `<tr><td style="padding:6px 0;color:#6b7280;width:140px;">Due Date</td><td style="padding:6px 0;font-weight:600;">${inv.dueDate}</td></tr>`
      : '';

    const taxRow = Number(inv.tax) > 0
      ? `<tr><td style="padding:6px 0;color:#6b7280;">Tax</td><td style="padding:6px 0;">${fmtCur(inv.tax)}</td></tr>`
      : '';

    const originHeader = req.headers.origin;
    const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader)
      ?? `${req.protocol}://${req.headers.host}`;

    const viewUrl = `${origin}/invoice/${viewToken}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <div style="background:#B22234;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Invoice from Dust to Done</h1>
        </div>
        <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hi ${inv.clientName},</p>
          <p style="margin:0 0 20px;">Please find your invoice details below. You can view and pay it online using the button below.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:6px 0;color:#6b7280;width:140px;">Invoice #</td>
              <td style="padding:6px 0;font-weight:600;">${inv.invoiceNumber}</td>
            </tr>
            ${inv.projectDescription ? `<tr><td style="padding:6px 0;color:#6b7280;">Project</td><td style="padding:6px 0;">${inv.projectDescription}</td></tr>` : ''}
            ${dueDateRow}
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Subtotal</td>
              <td style="padding:6px 0;">${fmtCur(inv.subtotal)}</td>
            </tr>
            ${taxRow}
            <tr>
              <td style="padding:6px 0;color:#6b7280;">${alreadyPaid ? 'Invoice Total' : 'Total Due'}</td>
              <td style="padding:6px 0;font-weight:700;font-size:18px;color:#B22234;">${fmtCur(inv.total)}</td>
            </tr>
          </table>

          ${lineItems.length > 0 ? `
          <h3 style="margin:0 0 10px;font-size:14px;color:#374151;border-bottom:2px solid #B22234;padding-bottom:6px;">Services &amp; Materials</h3>
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

          ${inv.notes ? `<p style="margin:0 0 20px;font-size:13px;color:#6b7280;"><strong>Notes:</strong> ${inv.notes}</p>` : ''}

          ${alreadyPaid
            ? `<div style="text-align:center;margin:28px 0 20px;">
            <div style="display:inline-block;border:3px solid #16a34a;border-radius:6px;padding:10px 32px;transform:rotate(-3deg);">
              <span style="color:#16a34a;font-family:Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">PAID IN FULL</span>
            </div>
          </div>
          <div style="text-align:center;margin:0 0 20px;">
            <a href="${viewUrl}" style="display:inline-block;background:#6b7280;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:10px 28px;border-radius:6px;">View Invoice</a>
          </div>`
            : `<div style="text-align:center;margin:28px 0 12px;">
            <a href="${viewUrl}" style="display:inline-block;background:#B22234;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;">View &amp; Pay Invoice</a>
          </div>
          <p style="text-align:center;margin:0 0 20px;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${viewUrl}" style="color:#B22234;">${viewUrl}</a></p>`}

          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Dust to Done Renovation Solutions LLC</p>
        </div>
      </div>`;

    const text = `Invoice from Dust to Done\n\nInvoice: ${inv.invoiceNumber}\nClient: ${inv.clientName}\nTotal Due: ${fmtCur(inv.total)}\n${inv.dueDate ? `Due: ${inv.dueDate}\n` : ''}${inv.notes ? `Notes: ${inv.notes}\n` : ''}\nView & Pay: ${viewUrl}`;

    await sendEmail({
      fromName: 'Dust to Done',
      to: toEmail,
      subject: alreadyPaid ? `Invoice ${inv.invoiceNumber} - Paid in Full` : `Invoice ${inv.invoiceNumber} from Dust to Done`,
      html,
      text,
    });

    if (!alreadyPaid) {
      await db.update(invoices).set({ status: 'sent' }).where(eq(invoices.id, id));
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('send invoice email error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
