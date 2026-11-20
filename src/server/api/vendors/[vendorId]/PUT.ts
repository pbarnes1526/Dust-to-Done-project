import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { vendors } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ vendorId: string }>, res: Response) {
  try {
    const id = Number(req.params.vendorId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, trade, contactName, email, phone, address, notes } = req.body as {
      name?: string; trade?: string; contactName?: string; email?: string;
      phone?: string; address?: string; notes?: string;
    };
    await db.update(vendors).set({ name, trade: trade ?? null, contactName: contactName ?? null,
      email: email ?? null, phone: phone ?? null, address: address ?? null, notes: notes ?? null,
    }).where(eq(vendors.id, id));
    const [updated] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update vendor', message: String(error) });
  }
}
