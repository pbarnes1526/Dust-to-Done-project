/**
 * BetterAuth Server Configuration
 *
 * Supports both Email/Password and OAuth authentication.
 * Enable/disable methods by uncommenting the relevant sections.
 *
 * Secrets (via getSecret from #airo/secrets):
 * - BETTER_AUTH_SECRET: Session encryption key (auto-generated during install)
 * - OAuth credentials (GOOGLE_CLIENT_ID, etc.) for social login
 *
 * CORS/Trusted Origins:
 * - Only trusts origins matching the server's hostname
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/server/db/client';
import { user, session, account, verification } from '@/server/db/schema';
import { getSecret } from '#airo/secrets';

// Lazy singleton — betterAuth() must NOT run at module init time.
//
// The BETTER_AUTH_SECRET is loaded from the alloc config at runtime, so the
// auth instance must be constructed after the secrets are available (i.e. on
// the first HTTP request, not at import time).
//
// Pattern mirrors how db/client.ts defers the actual MySQL connection — the
// pool object is safe to create at init, but anything that reads schema state
// or secrets must be deferred to request time.
// Typed from createAuth's real config so Session and User include additionalFields (isAdmin).
let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
  _auth ??= createAuth();
  return _auth;
}

function createAuth() {
  const authSecret = getSecret('BETTER_AUTH_SECRET');
  if (!authSecret || typeof authSecret !== 'string') {
    throw new Error('BETTER_AUTH_SECRET is not set or invalid — run requestSecrets() first');
  }

  if (!db) {
    throw new Error('Database not configured. Install the database skill first, then configure auth.');
  }

  return betterAuth({
    // Schema passed explicitly — avoids BetterAuth's runtime schema inference.
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema: { user, session, account, verification },
    }),

    secret: authSecret,

    // Protect admin status field from user input
    user: {
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          defaultValue: false,
          input: false,  // Prevent clients from writing this field
          returned: true,
        },
      },
    },

    // CORS: Trusts .airoapp.ai subdomains and localhost by default.
    // If your app has a custom domain, add it here or set BETTER_AUTH_TRUSTED_ORIGINS.
    trustedOrigins: (request?: Request) => {
      if (!request) return [];

      const origin = request.headers.get('origin');
      if (!origin) return [];

      try {
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;

        // Trust all airoapp.ai subdomains
        if (hostname.endsWith('.airoapp.ai') || hostname.endsWith('.test-airoapp.ai')) {
          return [origin];
        }

        // Trust localhost for development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return [origin];
        }

        return [];
      } catch {
        return [];
      }
    },

    // In preview mode the site runs in an iframe embedded by the builder on a different
    // origin, so cookies need SameSite=None + Secure + Partitioned (CHIPS) for cross-site
    // access. In publish mode (standalone) we use the safer SameSite=Lax default.
    ...(process.env.AIRO_PREVIEW === 'true' && {
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none' as const,
          secure: true,
          partitioned: true,
        },
      },
    }),

    emailAndPassword: {
      enabled: true,
      // Disable public sign-up — the /setup page creates the first owner account
      // via a server-side hook that checks for zero existing users. After that,
      // this flag prevents any further registrations.
      disableSignUp: false, // toggled to true by the setup endpoint after first owner is created
      requireEmailVerification: false,
      sendResetPassword: async ({ user: _user, url }) => {
        // Log the reset URL to server stdout so the owner can retrieve it.
        // In production you would wire this to the email skill instead.
        console.log(JSON.stringify({
          event: 'password_reset_requested',
          email: _user.email,
          resetUrl: url,
        }));
      },
    },

    // Owner-only guard: reject sign-up if an owner account already exists.
    // This runs server-side on every sign-up attempt, including direct API calls.
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            // Allow the very first account (owner setup).
            // After that, block all further registrations.
            const existing = await db.select().from(user).limit(1);
            if (existing.length > 0) {
              throw new Error('OWNER_EXISTS: Registration is closed. This application is owner-only.');
            }
            return { data: newUser };
          },
        },
      },
    },
  });
}

export type Session = ReturnType<typeof getAuth>['$Infer']['Session'];
export type User = ReturnType<typeof getAuth>['$Infer']['Session']['user'];
