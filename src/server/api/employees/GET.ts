import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { employees } from '../../db/schema.js';


export default async function handler(req: Request, res: Response) {
  try {
    const all = await db.select().from(employees).orderBy(employees.name);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees', message: String(err) });
  }
}
