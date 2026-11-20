import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getSecret } from '#airo/secrets';

export default async function handler(req: Request, res: Response): Promise<void> {
  const { invoiceId, invoiceNumber, clientName, balanceDue } = req.body as {
    invoiceId: number;
    invoiceNumber: string;
    clientName: string;
    balanceDue: number; // in cents
  };

  if (!invoiceId || !balanceDue || balanceDue <= 0) {
    res.status(400).json({ error: 'Invalid invoice or balance due.' });
    return;
  }

  const secretKey = getSecret('STRIPE_SECRET_KEY');
  if (!secretKey) {
    res.status(500).json({ error: 'Stripe is not configured.' });
    return;
  }

  const stripe = new Stripe(secretKey as string, { apiVersion: '2026-02-25.clover' });

  const originHeader = req.headers.origin;
  const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader) ?? `${req.protocol}://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: balanceDue,
            product_data: {
              name: `Invoice ${invoiceNumber}`,
              description: `Payment for ${clientName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: String(invoiceId),
        invoiceNumber,
        clientName,
        balanceDue: String(balanceDue),
      },
      success_url: `${origin}/checkout/invoice-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/invoices`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    res.status(500).json({ error: message });
  }
}
