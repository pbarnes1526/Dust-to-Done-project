import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { calendarEvents } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ eventId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.eventId);
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
