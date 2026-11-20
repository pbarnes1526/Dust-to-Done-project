// POST /api/estimates/view/:token/approve — public, no auth required
// Customer clicks "Accept Estimate" from their email link
import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { estimates } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email';
import { getSecret } from '#airo/secrets';

export default async function handler(req: Request<{ token: string }>, res: Response) {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Invalid token' });

    const [est] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.viewToken, token))
      .limit(1);

    if (!est) return res.status(404).json({ error: 'Estimate not found' });
    if (est.status === 'approved') return res.json({ ok: true, alreadyApproved: true });

    await db.update(estimates).set({ status: 'approved' }).where(eq(estimates.id, est.id));

    // Notify the owner
    const recipient = getSecret('NOTIFICATION_RECIPIENT_EMAIL');
    if (typeof recipient === 'string' && recipient.length > 0) {
      const fmtCur = (v: string | number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:#16a34a;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Estimate Accepted!</h1>
          </div>
          <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 16px;"><strong>${est.clientName}</strong> has accepted estimate <strong>${est.estimateNumber}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Estimate #</td><td style="padding:6px 0;font-weight:600;">${est.estimateNumber}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;">${est.clientName}</td></tr>
              ${est.clientEmail ? `<tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${est.clientEmail}</td></tr>` : ''}
              ${est.clientPhone ? `<tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${est.clientPhone}</td></tr>` : ''}
              <tr><td style="padding:6px 0;color:#6b7280;">Total</td><td style="padding:6px 0;font-weight:700;font-size:18px;color:#16a34a;">${fmtCur(est.total)}</td></tr>
            </table>
            ${est.projectDescription ? `<p style="margin:0;font-size:13px;color:#6b7280;"><strong>Project:</strong> ${est.projectDescription}</p>` : ''}
          </div>
        </div>`;

      try {
        await sendEmail({
          fromName: 'Dust to Done',
          to: recipient,
          subject: `Estimate Accepted — ${est.estimateNumber} (${est.clientName})`,
          html,
          text: `Estimate Accepted\n\n${est.clientName} accepted estimate ${est.estimateNumber}\nTotal: ${fmtCur(est.total)}`,
        });
      } catch {
        // Don't fail approval if notification email fails
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('estimate approve by token error:', error);
    return res.status(500).json({ error: 'Failed to approve estimate' });
  }
}
