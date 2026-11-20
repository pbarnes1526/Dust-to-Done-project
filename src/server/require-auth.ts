// requireAuth - Express middleware that rejects unauthenticated API requests.
//
// Reads the BetterAuth session from the incoming request cookie.
// Returns 401 JSON for missing/invalid sessions.
// Attaches req.authUser for downstream handlers.
import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@/lib/auth/auth';
import { toWebRequest } from '@/lib/auth/express-adapter';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; email: string; name?: string | null };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth();
    const webReq = toWebRequest(req);
    const session = await auth.api.getSession({ headers: webReq.headers });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return;
    }

    req.authUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Session validation failed.' });
  }
}
