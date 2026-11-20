// GET /api/setup
// Returns whether the owner account has been created yet.
// Public - used by the /setup page to decide whether to show the form.
import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { user } from '../../db/schema.js';

export default async function handler(_req: Request, res: Response) {
  try {
    const existing = await db.select({ id: user.id }).from(user).limit(1);
    res.json({ setupRequired: existing.length === 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
