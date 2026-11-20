// POST /api/invoices/view/:token/check-payment -- public, no auth required
// Customer confirms they will pay by check; marks invoice paid and records a check payment.
import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { invoices, payments } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email';
import { getSecret } from '#airo/secrets';

export default async function handler(req: Request<{ token: string }>, res: Response) {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Invalid token' });

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.viewToken, token))
      .limit(1);

    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status === 'paid') return res.json({ ok: true, alreadyPaid: true });
    if (inv.status === 'cancelled') return res.status(400).json({ error: 'Invoice is cancelled' });

    const today = new Date().toISOString().slice(0, 10);

    // Mark invoice paid
    await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, inv.id));

    // Record a check payment
    await db.insert(payments).values({
      jobId: inv.jobId ?? null,
      invoiceId: inv.id,
      amount: String(inv.total),
      paymentDate: today,
      method: 'check',
      referenceNumber: null,
      notes: 'Check payment confirmed by customer via invoice link (' + inv.invoiceNumber + ')',
    });

    // Notify the owner
    const recipient = getSecret('NOTIFICATION_RECIPIENT_EMAIL');
    if (typeof recipient === 'string' && recipient.length > 0) {
      const fmtCur = (v: string | number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

      const html =
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">' +
        '<div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">' +
        '<h1 style="margin:0;color:#fff;font-size:22px;">Check Payment Confirmed!</h1>' +
        '</div>' +
        '<div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">' +
        '<p style="margin:0 0 16px;"><strong>' + inv.clientName + '</strong> confirmed a check payment for invoice <strong>' + inv.invoiceNumber + '</strong>.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        '<tr><td style="padding:6px 0;color:#6b7280;width:140px;">Invoice #</td><td style="padding:6px 0;font-weight:600;">' + inv.invoiceNumber + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;">' + inv.clientName + '</td></tr>' +
        (inv.clientEmail ? '<tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">' + inv.clientEmail + '</td></tr>' : '') +
        '<tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="padding:6px 0;font-weight:700;font-size:18px;color:#2563eb;">' + fmtCur(inv.total) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#6b7280;">Method</td><td style="padding:6px 0;">Check</td></tr>' +
        '</table>' +
        '<p style="margin:0;font-size:13px;color:#6b7280;">The invoice has been marked Paid and a check payment record has been created.</p>' +
        '</div></div>';

      try {
        await sendEmail({
          fromName: 'Dust to Done',
          to: recipient,
          subject: 'Check Payment Confirmed -- ' + inv.invoiceNumber + ' (' + inv.clientName + ')',
          html,
          text: 'Check Payment Confirmed\n\n' + inv.clientName + ' confirmed check payment for invoice ' + inv.invoiceNumber + '\nAmount: ' + fmtCur(inv.total),
        });
      } catch {
        // Don't fail if notification email fails
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('invoice check payment error:', error);
    return res.status(500).json({ error: 'Failed to record check payment' });
  }
}
