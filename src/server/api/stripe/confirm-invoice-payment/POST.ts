// POST /api/stripe/confirm-invoice-payment
// PUBLIC endpoint — called by the invoice success page after Stripe redirects back.
// Validates the Stripe session server-side before recording the payment.
// This prevents a client from spoofing a payment by calling /api/payments directly.
//
// Body: { sessionId: string }
// Returns: { ok: true, invoiceId, invoiceNumber, clientName, amountPaid, paymentIntentId }
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getSecret } from '#airo/secrets';
import { db } from '../../../db/client.js';
import { payments, invoices } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    res.status(400).json({ error: 'Invalid or missing sessionId.' });
    return;
  }

  const secretKey = getSecret('STRIPE_SECRET_KEY');
  if (!secretKey) {
    res.status(500).json({ error: 'Stripe is not configured.' });
    return;
  }

  const stripe = new Stripe(secretKey as string, { apiVersion: '2026-02-25.clover' });

  try {
    // Retrieve and validate the session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      res.status(402).json({ error: 'Payment not completed.' });
      return;
    }

    const invoiceId = Number(session.metadata?.invoiceId);
    const invoiceNumber = session.metadata?.invoiceNumber ?? '';
    const clientName = session.metadata?.clientName ?? '';
    const amountPaid = session.amount_total ?? 0;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? '';

    if (!invoiceId) {
      res.status(400).json({ error: 'Session metadata missing invoiceId.' });
      return;
    }

    // Idempotency: check if this payment_intent was already recorded
    const existing = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.referenceNumber, paymentIntentId))
      .limit(1);

    if (existing.length === 0) {
      // Record the payment
      await db.insert(payments).values({
        invoiceId,
        jobId: null,
        amount: (amountPaid / 100).toFixed(2),
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'other', // 'other' represents Stripe online payment (enum has no 'stripe' value)
        referenceNumber: paymentIntentId,
        notes: `Online payment via Stripe — Invoice ${invoiceNumber}`,
      });

      // Mark invoice as paid if fully paid
      await db
        .update(invoices)
        .set({ status: 'paid' })
        .where(eq(invoices.id, invoiceId));
    }

    res.json({
      ok: true,
      invoiceId,
      invoiceNumber,
      clientName,
      amountPaid,
      paymentIntentId,
    });
  } catch (err) {
    console.error('confirm-invoice-payment failed:', err);
    if (err instanceof Stripe.errors.StripeError) {
      res.status(err.statusCode || 500).json({ error: 'Stripe error. Please contact support.' });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm payment.' });
  }
}
