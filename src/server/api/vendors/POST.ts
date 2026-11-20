import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { vendors } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, trade, contactName, email, phone, address, notes } = req.body as {
      name: string; trade?: string; contactName?: string; email?: string;
      phone?: string; address?: string; notes?: string;
    };
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await db.insert(vendors).values({
      name, trade: trade ?? null, contactName: contactName ?? null,
      email: email ?? null, phone: phone ?? null,
      address: address ?? null, notes: notes ?? null,
    });
    const [created] = await db.select().from(vendors).where(eq(vendors.id, Number(result[0].insertId))).limit(1);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create vendor', message: String(error) });
  }
}
