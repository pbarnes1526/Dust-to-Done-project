import { RouteObject } from 'react-router';
import { lazy } from 'react';
import { ProtectedRoute } from '@/lib/auth/auth-client';
import HomePage from './pages/index';
import LoginPage from './pages/login';
import SetupPage from './pages/setup';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';

const JobsPage = lazy(() => import('./pages/jobs'));
const EstimatesPage = lazy(() => import('./pages/estimates'));
const EstimateViewPage = lazy(() => import('./pages/estimate-view'));
const InvoiceViewPage = lazy(() => import('./pages/invoice-view'));
const ExpensesPage = lazy(() => import('./pages/expenses'));
const InvoicesPage = lazy(() => import('./pages/invoices'));
const DocumentsPage = lazy(() => import('./pages/documents'));
const ContractsPage = lazy(() => import('./pages/contracts'));
const VendorsPage = lazy(() => import('./pages/vendors'));
const ReportsPage = lazy(() => import('./pages/reports'));
const SettingsPage = lazy(() => import('./pages/settings'));
const PriceLibraryPage = lazy(() => import('./pages/price-library'));
const SupplierPricingPage = lazy(() => import('./pages/supplier-pricing'));
const PaymentsPage = lazy(() => import('./pages/payments'));
const InvoiceSuccessPage = lazy(() => import('./pages/checkout/invoice-success'));
const CheckoutCancelPage = lazy(() => import('./pages/checkout/cancel'));
const TakeoffPage = lazy(() => import('./pages/takeoff'));
const TakeoffDetailPage = lazy(() => import('./pages/takeoff-detail'));
const ScopePage = lazy(() => import('./pages/scope'));
const ScopeDetailPage = lazy(() => import('./pages/scope-detail'));
const EmployeesPage = lazy(() => import('./pages/employees'));
const CalendarPage = lazy(() => import('./pages/calendar'));
const MaterialOrdersPage = lazy(() => import('./pages/material-orders'));
const CustomersPage = lazy(() => import('./pages/customers'));

// Eager import so renderToString doesn't hit a Suspense boundary on 404 routes
// and abort to client rendering. The prod 404 page is tiny; the dev-tools
// variant stays lazy because it pulls in dev-only code we don't want in
// production bundles.
import ProdNotFoundPage from './pages/_404';

const NotFoundPage = ProdNotFoundPage;

// Helper: wrap a page element in ProtectedRoute
function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export const routes: RouteObject[] = [
  // ── Public auth routes (no ProtectedRoute) ──────────────────────────────────
  { path: '/login', element: <LoginPage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // ── Public customer-facing pages (token-based, no login required) ────────────
  { path: '/estimate/:token', element: <EstimateViewPage /> },
  { path: '/invoice/:token', element: <InvoiceViewPage /> },

  // ── Protected app routes ────────────────────────────────────────────────────
  { path: '/', element: <P><HomePage /></P> },
  { path: '/employees', element: <P><EmployeesPage /></P> },
  { path: '/calendar', element: <P><CalendarPage /></P> },
  { path: '/material-orders', element: <P><MaterialOrdersPage /></P> },
  { path: '/customers', element: <P><CustomersPage /></P> },
  { path: '/scope', element: <P><ScopePage /></P> },
  { path: '/scope/:scopeId', element: <P><ScopeDetailPage /></P> },
  { path: '/takeoff', element: <P><TakeoffPage /></P> },
  { path: '/takeoff/:projectId', element: <P><TakeoffDetailPage /></P> },
  { path: '/jobs', element: <P><JobsPage /></P> },
  { path: '/jobs/:jobId', element: <P><JobsPage /></P> },
  { path: '/estimates', element: <P><EstimatesPage /></P> },
  { path: '/estimates/:estimateId', element: <P><EstimatesPage /></P> },

  { path: '/expenses', element: <P><ExpensesPage /></P> },
  { path: '/invoices', element: <P><InvoicesPage /></P> },
  { path: '/invoices/:invoiceId', element: <P><InvoicesPage /></P> },
  { path: '/documents', element: <P><DocumentsPage /></P> },
  { path: '/contracts', element: <P><ContractsPage /></P> },
  { path: '/vendors', element: <P><VendorsPage /></P> },
  { path: '/payments', element: <P><PaymentsPage /></P> },
  { path: '/price-library', element: <P><PriceLibraryPage /></P> },
  { path: '/supplier-pricing', element: <P><SupplierPricingPage /></P> },
  { path: '/reports', element: <P><ReportsPage /></P> },
  { path: '/settings', element: <P><SettingsPage /></P> },
  { path: '/checkout/invoice-success', element: <P><InvoiceSuccessPage /></P> },
  { path: '/checkout/cancel', element: <P><CheckoutCancelPage /></P> },

  {
    id: 'airo-not-found',
    path: '*',
    element: <NotFoundPage />,
  },
];

// Types for type-safe navigation
export type Path = '/';

export type Params = Record<string, string | undefined>;
