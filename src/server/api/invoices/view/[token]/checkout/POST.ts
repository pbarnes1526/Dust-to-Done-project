// POST /api/invoices/view/:token/checkout — public, no auth required
// Creates a Stripe checkout session for the customer to pay their invoice
import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { invoices } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
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
    if (inv.status === 'paid') return res.status(400).json({ error: 'Invoice is already paid' });
    if (Number(inv.total) <= 0) return res.status(400).json({ error: 'Invoice has no balance due' });

    const stripeKey = getSecret('STRIPE_SECRET_KEY');
    if (!stripeKey) return res.status(503).json({ error: 'Payment processing not configured' });

    const originHeader = req.headers.origin;
    const origin = (Array.isArray(originHeader) ? originHeader[0] : originHeader)
      ?? `${req.protocol}://${req.headers.host}`;

    const stripe = new Stripe(stripeKey as string);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(inv.total) * 100),
          product_data: {
            name: `Invoice ${inv.invoiceNumber}`,
            ...(inv.projectDescription?.trim()
              ? { description: inv.projectDescription.trim() }
              : {}),
          },
        },
        quantity: 1,
      }],
      metadata: {
        invoiceId: String(inv.id),
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        balanceDue: String(Math.round(Number(inv.total) * 100)),
      },
      success_url: `${origin}/checkout/invoice-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/invoice/${token}`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('invoice token checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
