/**
 * Auto-synced registry of publicly-crawlable routes. Consumed by the
 * /sitemap.xml handler in src/server/entry.ts.
 *
 * DO NOT add or remove paths by hand. Static paths are mirrored here from
 * src/routes.tsx automatically whenever that file is edited (any manual
 * path edit would be overwritten on the next routes.tsx change). For sync
 * to pick up a route, its `path` must be a literal string starting with "/";
 * template literals and identifier refs are skipped, and dynamic-param routes
 * like "/products/:id" are excluded. The legal pages "/privacy" and "/terms"
 * are never listed here.
 *
 * The only fields safe to hand-edit are the per-entry metadata below, after a
 * sync:
 * - `priority` (0.0–1.0): Home = 1.0, main sections = 0.8, deep pages = 0.5.
 * - `changefreq` and `lastmod`.
 */

export interface SeoRoute {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  lastmod?: string;
}

export const seoRoutes: SeoRoute[] = [
  { path: "/login", changefreq: "monthly", priority: 0.8 },
  { path: "/setup", changefreq: "monthly", priority: 0.8 },
  { path: "/forgot-password", changefreq: "monthly", priority: 0.8 },
  { path: "/reset-password", changefreq: "monthly", priority: 0.8 },
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/employees", changefreq: "monthly", priority: 0.8 },
  { path: "/calendar", changefreq: "monthly", priority: 0.8 },
  { path: "/material-orders", changefreq: "monthly", priority: 0.8 },
  { path: "/customers", changefreq: "monthly", priority: 0.8 },
  { path: "/scope", changefreq: "monthly", priority: 0.8 },
  { path: "/takeoff", changefreq: "monthly", priority: 0.8 },
  { path: "/jobs", changefreq: "monthly", priority: 0.8 },
  { path: "/estimates", changefreq: "monthly", priority: 0.8 },
  { path: "/expenses", changefreq: "monthly", priority: 0.8 },
  { path: "/invoices", changefreq: "monthly", priority: 0.8 },
  { path: "/documents", changefreq: "monthly", priority: 0.8 },
  { path: "/contracts", changefreq: "monthly", priority: 0.8 },
  { path: "/vendors", changefreq: "monthly", priority: 0.8 },
  { path: "/payments", changefreq: "monthly", priority: 0.8 },
  { path: "/price-library", changefreq: "monthly", priority: 0.8 },
  { path: "/supplier-pricing", changefreq: "monthly", priority: 0.8 },
  { path: "/reports", changefreq: "monthly", priority: 0.8 },
  { path: "/settings", changefreq: "monthly", priority: 0.8 },
  { path: "/checkout/invoice-success", changefreq: "monthly", priority: 0.5 },
  { path: "/checkout/cancel", changefreq: "monthly", priority: 0.5 },
];
