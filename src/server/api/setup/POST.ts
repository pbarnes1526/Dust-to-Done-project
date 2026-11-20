// POST /api/setup
// Creates the first (and only) owner account via BetterAuth.
// Rejects if an owner already exists - this endpoint is permanently
// disabled after first use by the databaseHook in auth.ts.
//
// Body: { name, email, password }
import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { user } from '../../db/schema.js';
import { getAuth } from '@/lib/auth/auth';

export default async function handler(req: Request, res: Response) {
  try {
    // Double-check: reject if owner already exists (defense in depth)
    const existing = await db.select({ id: user.id }).from(user).limit(1);
    if (existing.length > 0) {
      return res.status(403).json({
        error: 'Setup already complete',
        message: 'An owner account already exists. Setup is permanently closed.',
      });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Create the owner account through BetterAuth (handles hashing, account row, etc.)
    const auth = getAuth();
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result || !result.user) {
      return res.status(500).json({ error: 'Account creation failed. Check server logs.' });
    }

    return res.status(201).json({
      ok: true,
      message: 'Owner account created. You can now log in.',
      email: result.user.email,
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('OWNER_EXISTS')) {
      return res.status(403).json({
        error: 'Setup already complete',
        message: 'An owner account already exists.',
      });
    }
    return res.status(500).json({ error: 'Setup failed', message: msg });
  }
}
