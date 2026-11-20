import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { isIP } from "node:net";
import { dirname, extname, join } from "node:path";
import { readFileSync } from "node:fs";

import { startPriceRefreshScheduler } from "./services/price-refresh-scheduler";

// <api-imports>
import auth__action__get from "./api/auth/[action]/GET";
import auth__action__post from "./api/auth/[action]/POST";
import auth__action__detail__get from "./api/auth/[action]/[detail]/GET";
import auth__action__detail__post from "./api/auth/[action]/[detail]/POST";
import calendar__get from "./api/calendar/GET";
import calendar__post from "./api/calendar/POST";
import calendar__eventId__delete from "./api/calendar/[eventId]/DELETE";
import calendar__eventId__put from "./api/calendar/[eventId]/PUT";
import contracts__get from "./api/contracts/GET";
import contracts__post from "./api/contracts/POST";
import contracts__by_id__delete from "./api/contracts/by-id/DELETE";
import contracts__by_id__get from "./api/contracts/by-id/GET";
import contracts__by_id__put from "./api/contracts/by-id/PUT";
import contracts__by_id__send_email__post from "./api/contracts/by-id/send-email/POST";
import contracts__contractId__delete from "./api/contracts/[contractId]/DELETE";
import contracts__contractId__get from "./api/contracts/[contractId]/GET";
import contracts__contractId__put from "./api/contracts/[contractId]/PUT";
import customers__get from "./api/customers/GET";
import customers__post from "./api/customers/POST";
import customers__customerId__delete from "./api/customers/[customerId]/DELETE";
import customers__customerId__get from "./api/customers/[customerId]/GET";
import customers__customerId__put from "./api/customers/[customerId]/PUT";
import documents__get from "./api/documents/GET";
import documents__post from "./api/documents/POST";
import documents__upload__post from "./api/documents/upload/POST";
import documents__docId__delete from "./api/documents/[docId]/DELETE";
import documents__docId__put from "./api/documents/[docId]/PUT";
import employees__get from "./api/employees/GET";
import employees__post from "./api/employees/POST";
import employees__empId__delete from "./api/employees/[empId]/DELETE";
import employees__empId__get from "./api/employees/[empId]/GET";
import employees__empId__put from "./api/employees/[empId]/PUT";
import estimates__get from "./api/estimates/GET";
import estimates__post from "./api/estimates/POST";
import estimates__by_id__add_line_item__post from "./api/estimates/by-id/add-line-item/POST";
import estimates__photo_upload__post from "./api/estimates/photo-upload/POST";
import estimates__view__token__get from "./api/estimates/view/[token]/GET";
import estimates__view__token__approve__post from "./api/estimates/view/[token]/approve/POST";
import estimates__estimateId__delete from "./api/estimates/[estimateId]/DELETE";
import estimates__estimateId__get from "./api/estimates/[estimateId]/GET";
import estimates__estimateId__put from "./api/estimates/[estimateId]/PUT";
import estimates__estimateId__approve__post from "./api/estimates/[estimateId]/approve/POST";
import estimates__estimateId__create_invoice__post from "./api/estimates/[estimateId]/create-invoice/POST";
import estimates__estimateId__send_email__post from "./api/estimates/[estimateId]/send-email/POST";
import expenses__get from "./api/expenses/GET";
import expenses__post from "./api/expenses/POST";
import expenses__receipt_upload__post from "./api/expenses/receipt-upload/POST";
import expenses__expenseId__delete from "./api/expenses/[expenseId]/DELETE";
import expenses__expenseId__get from "./api/expenses/[expenseId]/GET";
import expenses__expenseId__put from "./api/expenses/[expenseId]/PUT";
import health__get from "./api/health/GET";
import invoices__get from "./api/invoices/GET";
import invoices__post from "./api/invoices/POST";
import invoices__view__token__get from "./api/invoices/view/[token]/GET";
import invoices__view__token__cash_payment__post from "./api/invoices/view/[token]/cash-payment/POST";
import invoices__view__token__check_payment__post from "./api/invoices/view/[token]/check-payment/POST";
import invoices__view__token__checkout__post from "./api/invoices/view/[token]/checkout/POST";
import invoices__view__token__transfer_payment__post from "./api/invoices/view/[token]/transfer-payment/POST";
import invoices__invoiceId__delete from "./api/invoices/[invoiceId]/DELETE";
import invoices__invoiceId__get from "./api/invoices/[invoiceId]/GET";
import invoices__invoiceId__put from "./api/invoices/[invoiceId]/PUT";
import invoices__invoiceId__send_email__post from "./api/invoices/[invoiceId]/send-email/POST";
import jobs__get from "./api/jobs/GET";
import jobs__post from "./api/jobs/POST";
import jobs__jobId__delete from "./api/jobs/[jobId]/DELETE";
import jobs__jobId__get from "./api/jobs/[jobId]/GET";
import jobs__jobId__put from "./api/jobs/[jobId]/PUT";
import jobs__jobId__assignments__get from "./api/jobs/[jobId]/assignments/GET";
import jobs__jobId__assignments__post from "./api/jobs/[jobId]/assignments/POST";
import jobs__jobId__assignments__assignId__delete from "./api/jobs/[jobId]/assignments/[assignId]/DELETE";
import jobs__jobId__checklist__get from "./api/jobs/[jobId]/checklist/GET";
import jobs__jobId__checklist__post from "./api/jobs/[jobId]/checklist/POST";
import jobs__jobId__checklist__itemId__delete from "./api/jobs/[jobId]/checklist/[itemId]/DELETE";
import jobs__jobId__checklist__itemId__put from "./api/jobs/[jobId]/checklist/[itemId]/PUT";
import jobs__jobId__materials__get from "./api/jobs/[jobId]/materials/GET";
import jobs__jobId__materials__post from "./api/jobs/[jobId]/materials/POST";
import jobs__jobId__materials__materialId__delete from "./api/jobs/[jobId]/materials/[materialId]/DELETE";
import jobs__jobId__materials__materialId__put from "./api/jobs/[jobId]/materials/[materialId]/PUT";
import jobs__jobId__photos__get from "./api/jobs/[jobId]/photos/GET";
import jobs__jobId__photos__post from "./api/jobs/[jobId]/photos/POST";
import jobs__jobId__photos__photoId__delete from "./api/jobs/[jobId]/photos/[photoId]/DELETE";
import jobs__jobId__schedules__get from "./api/jobs/[jobId]/schedules/GET";
import jobs__jobId__schedules__post from "./api/jobs/[jobId]/schedules/POST";
import jobs__jobId__schedules__schedId__delete from "./api/jobs/[jobId]/schedules/[schedId]/DELETE";
import jobs__jobId__schedules__schedId__put from "./api/jobs/[jobId]/schedules/[schedId]/PUT";
import jobs__jobId__stage__get from "./api/jobs/[jobId]/stage/GET";
import jobs__jobId__stage__put from "./api/jobs/[jobId]/stage/PUT";
import material_orders__get from "./api/material-orders/GET";
import material_orders__post from "./api/material-orders/POST";
import material_orders__orderId__delete from "./api/material-orders/[orderId]/DELETE";
import material_orders__orderId__put from "./api/material-orders/[orderId]/PUT";
import notifications__get from "./api/notifications/GET";
import notifications__post from "./api/notifications/POST";
import notifications__read_all__post from "./api/notifications/read-all/POST";
import notifications__notifId__put from "./api/notifications/[notifId]/PUT";
import payments__get from "./api/payments/GET";
import payments__post from "./api/payments/POST";
import payments__summary__get from "./api/payments/summary/GET";
import payments__paymentId__delete from "./api/payments/[paymentId]/DELETE";
import payments__paymentId__put from "./api/payments/[paymentId]/PUT";
import price_library__get from "./api/price-library/GET";
import price_library__post from "./api/price-library/POST";
import price_library__import__post from "./api/price-library/import/POST";
import price_library__itemId__delete from "./api/price-library/[itemId]/DELETE";
import price_library__itemId__put from "./api/price-library/[itemId]/PUT";
import reports__get from "./api/reports/GET";
import scope__get from "./api/scope/GET";
import scope__post from "./api/scope/POST";
import scope__scopeId__delete from "./api/scope/[scopeId]/DELETE";
import scope__scopeId__get from "./api/scope/[scopeId]/GET";
import scope__scopeId__put from "./api/scope/[scopeId]/PUT";
import scope__scopeId__analyze__post from "./api/scope/[scopeId]/analyze/POST";
import scope__scopeId__change_orders__get from "./api/scope/[scopeId]/change-orders/GET";
import scope__scopeId__change_orders__post from "./api/scope/[scopeId]/change-orders/POST";
import scope__scopeId__change_orders__coId__delete from "./api/scope/[scopeId]/change-orders/[coId]/DELETE";
import scope__scopeId__change_orders__coId__put from "./api/scope/[scopeId]/change-orders/[coId]/PUT";
import scope__scopeId__cost_summary__get from "./api/scope/[scopeId]/cost-summary/GET";
import scope__scopeId__cost_summary__put from "./api/scope/[scopeId]/cost-summary/PUT";
import scope__scopeId__labor__get from "./api/scope/[scopeId]/labor/GET";
import scope__scopeId__labor__post from "./api/scope/[scopeId]/labor/POST";
import scope__scopeId__labor__laborId__delete from "./api/scope/[scopeId]/labor/[laborId]/DELETE";
import scope__scopeId__labor__laborId__put from "./api/scope/[scopeId]/labor/[laborId]/PUT";
import scope__scopeId__photos__post from "./api/scope/[scopeId]/photos/POST";
import scope__scopeId__photos__photoId__delete from "./api/scope/[scopeId]/photos/[photoId]/DELETE";
import scope__scopeId__send_to_takeoff__post from "./api/scope/[scopeId]/send-to-takeoff/POST";
import scope__scopeId__tasks__get from "./api/scope/[scopeId]/tasks/GET";
import scope__scopeId__tasks__post from "./api/scope/[scopeId]/tasks/POST";
import scope__scopeId__tasks__taskId__delete from "./api/scope/[scopeId]/tasks/[taskId]/DELETE";
import scope__scopeId__tasks__taskId__put from "./api/scope/[scopeId]/tasks/[taskId]/PUT";
import settings__company__get from "./api/settings/company/GET";
import settings__company__put from "./api/settings/company/PUT";
import settings__documents__get from "./api/settings/documents/GET";
import settings__documents__put from "./api/settings/documents/PUT";
import setup__get from "./api/setup/GET";
import setup__post from "./api/setup/POST";
import stripe__confirm_invoice_payment__post from "./api/stripe/confirm-invoice-payment/POST";
import stripe__create_checkout_session__post from "./api/stripe/create-checkout-session/POST";
import stripe__invoice_checkout__post from "./api/stripe/invoice-checkout/POST";
import stripe__session__sessionId__get from "./api/stripe/session/[sessionId]/GET";
import supplier_pricing__compare__get from "./api/supplier-pricing/compare/GET";
import supplier_pricing__history__get from "./api/supplier-pricing/history/GET";
import supplier_pricing__refresh__post from "./api/supplier-pricing/refresh/POST";
import supplier_pricing__refresh_history__get from "./api/supplier-pricing/refresh-history/GET";
import supplier_pricing__search__get from "./api/supplier-pricing/search/GET";
import supplier_pricing__select__post from "./api/supplier-pricing/select/POST";
import supplier_pricing__status__get from "./api/supplier-pricing/status/GET";
import takeoff__get from "./api/takeoff/GET";
import takeoff__post from "./api/takeoff/POST";
import takeoff__projectId__delete from "./api/takeoff/[projectId]/DELETE";
import takeoff__projectId__get from "./api/takeoff/[projectId]/GET";
import takeoff__projectId__put from "./api/takeoff/[projectId]/PUT";
import takeoff__projectId__analyze__post from "./api/takeoff/[projectId]/analyze/POST";
import takeoff__projectId__duplicate__post from "./api/takeoff/[projectId]/duplicate/POST";
import takeoff__projectId__estimate__put from "./api/takeoff/[projectId]/estimate/PUT";
import takeoff__projectId__export_csv__get from "./api/takeoff/[projectId]/export-csv/GET";
import takeoff__projectId__materials__post from "./api/takeoff/[projectId]/materials/POST";
import takeoff__projectId__materials__materialId__delete from "./api/takeoff/[projectId]/materials/[materialId]/DELETE";
import takeoff__projectId__materials__materialId__put from "./api/takeoff/[projectId]/materials/[materialId]/PUT";
import takeoff__projectId__photos__post from "./api/takeoff/[projectId]/photos/POST";
import takeoff__projectId__photos__photoId__delete from "./api/takeoff/[projectId]/photos/[photoId]/DELETE";
import vendors__get from "./api/vendors/GET";
import vendors__post from "./api/vendors/POST";
import vendors__vendorId__delete from "./api/vendors/[vendorId]/DELETE";
import vendors__vendorId__get from "./api/vendors/[vendorId]/GET";
import vendors__vendorId__put from "./api/vendors/[vendorId]/PUT";
// </api-imports>
import { seoRoutes } from "../lib/seo-routes";
import {
	loadAdSenseRuntimeConfig,
	resolveAdSenseTextFile,
	type AdSenseRuntimeConfig,
} from "./adsense-manifest";
import { loadIndexNowKey } from "./indexnow-key";
import { isSystemHost } from "./seo-host";
import { llmsTxtHandler } from "./llms-txt";
import contractsGet from "./api/contracts/GET";
import contractsPost from "./api/contracts/POST";
import contractGetOne from "./api/contracts/by-id/GET";
import contractPut from "./api/contracts/by-id/PUT";
import contractDelete from "./api/contracts/by-id/DELETE";
import contractSendEmail from "./api/contracts/by-id/send-email/POST";

export interface SsrRenderResult {
	html: string;
	head: string;
	status: number;
	redirect?: string;
}

/** Stands in for the route when the request failed before Express matched one. */
const UNROUTED: string = "(unrouted)";

/**
 * Names the route a request reached, never the target it asked for.
 *
 * A request target carries visitor data: a path segment can be an address
 * (`/signup/victim@example.com`) and a parameterized route holds a customer id, so
 * `req.baseUrl + req.path` logged both. `docs/privacy/pii.md` asks for the route
 * template instead — the string this app registered, which is fixed text.
 *
 * There is deliberately no fallback to `req.path` or `req.originalUrl`: a request
 * that matched no route has no template, and the placeholder is the honest answer.
 * The mount prefix is also omitted, because `req.baseUrl` is the resolved mount
 * rather than a template, so appending it would put request-derived text back.
 */
export function routeLabel(req: Request): string {
	const route: unknown = (req as { route?: unknown }).route;
	if (typeof route !== "object" || route === null) {
		return UNROUTED;
	}
	const template: unknown = (route as { path?: unknown }).path;
	if (typeof template === "string") {
		return template;
	}
	// The SSR catch-all route is registered with a RegExp path, so `path` is a RegExp.
	// The source is text this app wrote, so it is as fixed as a string template.
	if (template instanceof RegExp) {
		return template.source;
	}
	// A route registered with an array of paths has no single template.
	return UNROUTED;
}

/** Frames worth logging. Enough to name the throwing line and its caller. */
const MAX_LOGGED_FRAMES: number = 5;

/**
 * The call frames of an error, with its message removed.
 *
 * `stack` is the message with the frames appended, so the message has to come
 * off before any of it is logged. It is removed by its own length rather than by
 * looking for where the frames begin, because a message can contain anything:
 * body-parser puts a prefix of the request body into a parse failure's message,
 * and a visitor can put newlines and text shaped like a frame in that body.
 * Cutting an exact `name: message` prefix leaves only what the runtime wrote.
 *
 * Anything that does not have that exact prefix — a `stack` reassigned by a
 * library, or a `name` or `message` changed after the error was constructed —
 * reports no frames at all, so an unrecognised shape loses debuggability rather
 * than logging an unknown string.
 */
function loggedFrames(err: Error): string[] {
	if (typeof err.stack !== "string") {
		return [];
	}
	const headline: string = err.message ? `${err.name}: ${err.message}` : err.name;
	if (!err.stack.startsWith(headline)) {
		return [];
	}
	return err.stack
		.slice(headline.length)
		.split("\n")
		.filter((line: string): boolean => /^\s+at \S/.test(line))
		.slice(0, MAX_LOGGED_FRAMES)
		.map((line: string): string => line.trim());
}

/**
 * Reduces an error to fields that cannot carry request content.
 *
 * express.json() puts a prefix of the raw request body into a SyntaxError's
 * message, so the message is not safe to log on a request path: a form-encoded
 * body posted to a JSON route begins with the visitor's own field values. The
 * error class, plus body-parser's `type` and `status`, names the failure without
 * quoting what the client sent, and {@link loggedFrames} takes the frames out of
 * `stack` without the message that `stack` begins with.
 *
 * The message is dropped rather than gated on dev, because production is where a
 * customer app is actually debugged, so a dev-only escape hatch would not be
 * read. The frames are kept and the message is not: a frame names a file, a
 * function and a line the runtime itself recorded, while the message is the only
 * part an error carries that can quote what arrived in the request.
 */
export function toLogError(err: unknown): Record<string, unknown> {
	const shaped: Record<string, unknown> = {
		name: err instanceof Error ? err.name : typeof err,
	};
	const fields: Record<string, unknown> =
		typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
	if (typeof fields.type === "string") {
		shaped.type = fields.type;
	}
	if (typeof fields.code === "string" || typeof fields.code === "number") {
		shaped.code = fields.code;
	}
	if (typeof fields.status === "number") {
		shaped.status = fields.status;
	}
	if (err instanceof Error) {
		const frames: string[] = loggedFrames(err);
		if (frames.length > 0) {
			shaped.frames = frames;
		}
	}
	return shaped;
}

/**
 * Error handler for /api routes. Exported so tests can mount it on their own app
 * in the order Express requires (error middleware after the routes it protects).
 */
export const apiErrorHandler = (
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	// Always respond JSON on /api so clients parsing response.json() don't
	// receive Express's default HTML error page for non-Error throws.
	console.error("ssr.api.error", {
		route: routeLabel(req),
		error: toLogError(err),
	});
	res.status(500).json({ error: "Internal server error" });
};

/**
 * Last handler in the stack, for paths outside /api. Without it Express's default
 * handler runs, which writes err.stack to stderr and — whenever NODE_ENV is not
 * "production" — into the response body.
 */
export const finalErrorHandler = (
	err: unknown,
	req: Request,
	res: Response,
	// Unused, but Express identifies error middleware by arity: a 3-parameter
	// function is registered as an ordinary handler and never sees an error.
	_next: NextFunction,
): void => {
	console.error("ssr.request.failed", {
		route: routeLabel(req),
		error: toLogError(err),
	});
	if (res.headersSent) {
		// The response is already streaming, so there is no status left to set and no
		// body to replace. Forwarding to Express's default handler would hand it the
		// unsanitized error, which it writes to stderr as a raw stack — the leak this
		// handler exists to close. Destroying the socket instead aborts the partial
		// response, so the client sees a truncated transfer rather than a body that
		// looks complete. The log line above has already recorded the failure.
		res.destroy();
		return;
	}
	// Preserve the status Express's default handler would have chosen, so a
	// malformed body still answers 400 rather than 500.
	const rawStatus: unknown =
		typeof err === "object" && err !== null
			? ((err as { status?: unknown; statusCode?: unknown }).status ??
				(err as { statusCode?: unknown }).statusCode)
			: undefined;
	const status: number =
		typeof rawStatus === "number" && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
	res.status(status).type("text/plain").send("Internal Server Error");
};

export function registerAdSenseTextRoutes(app: Express, config: AdSenseRuntimeConfig): void {
	app.get("/ads.txt", (_req, res) => {
		const content = resolveAdSenseTextFile(config, "adsTxt");
		if (content === null) {
			res
				.status(404)
				.type("text/plain")
				.set("Cache-Control", "no-cache")
				.send("Not found\n");
			return;
		}
		res.type("text/plain").set("Cache-Control", "no-cache").send(content);
	});

	app.get("/app-ads.txt", (_req, res) => {
		const content = resolveAdSenseTextFile(config, "appAdsTxt");
		if (content === null) {
			res
				.status(404)
				.type("text/plain")
				.set("Cache-Control", "no-cache")
				.send("Not found\n");
			return;
		}
		res.type("text/plain").set("Cache-Control", "no-cache").send(content);
	});
}

export function renderSsrDocument(
	template: string,
	result: Pick<SsrRenderResult, "head" | "html">,
	adSenseConfig: Pick<AdSenseRuntimeConfig, "scriptHtml">,
): string {
	const head = [result.head, adSenseConfig.scriptHtml].filter(Boolean).join("\n");
	return template
		.replace("<!--app-head-->", () => head)
		.replace("<!--app-html-->", () => result.html);
}

function normalizeCommerceApiBaseUrlEnv() {
	if (process.env.GODADDY_API_BASE_URL) return;
	const hostOnly = process.env.VITE_GODADDY_API_HOST;
	if (!hostOnly) return;
	const normalizedHost = hostOnly.replace(/^https?:\/\//, "").trim();
	if (!normalizedHost) return;
	process.env.GODADDY_API_BASE_URL = `https://${normalizedHost}`;
}

normalizeCommerceApiBaseUrlEnv();

const app = express();

// Honour x-forwarded-* from the load balancer so req.protocol/req.hostname
// reflect the public-facing values. Express-maintained parsing respects the
// existing trust-proxy config; direct header reads would let a client spoof
// the sitemap origin in robots.txt.
app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <api-registrations>
app.get("/api/auth/:action", auth__action__get);
app.post("/api/auth/:action", auth__action__post);
app.get("/api/auth/:action/:detail", auth__action__detail__get);
app.post("/api/auth/:action/:detail", auth__action__detail__post);
app.get("/api/calendar", calendar__get);
app.post("/api/calendar", calendar__post);
app.delete("/api/calendar/:eventId", calendar__eventId__delete);
app.put("/api/calendar/:eventId", calendar__eventId__put);
app.get("/api/contracts", contracts__get);
app.post("/api/contracts", contracts__post);
app.delete("/api/contracts/by-id", contracts__by_id__delete);
app.get("/api/contracts/by-id", contracts__by_id__get);
app.put("/api/contracts/by-id", contracts__by_id__put);
app.post("/api/contracts/by-id/send-email", contracts__by_id__send_email__post);
app.delete("/api/contracts/:contractId", contracts__contractId__delete);
app.get("/api/contracts/:contractId", contracts__contractId__get);
app.put("/api/contracts/:contractId", contracts__contractId__put);
app.get("/api/customers", customers__get);
app.post("/api/customers", customers__post);
app.delete("/api/customers/:customerId", customers__customerId__delete);
app.get("/api/customers/:customerId", customers__customerId__get);
app.put("/api/customers/:customerId", customers__customerId__put);
app.get("/api/documents", documents__get);
app.post("/api/documents", documents__post);
app.post("/api/documents/upload", documents__upload__post);
app.delete("/api/documents/:docId", documents__docId__delete);
app.put("/api/documents/:docId", documents__docId__put);
app.get("/api/employees", employees__get);
app.post("/api/employees", employees__post);
app.delete("/api/employees/:empId", employees__empId__delete);
app.get("/api/employees/:empId", employees__empId__get);
app.put("/api/employees/:empId", employees__empId__put);
app.get("/api/estimates", estimates__get);
app.post("/api/estimates", estimates__post);
app.post("/api/estimates/by-id/add-line-item", estimates__by_id__add_line_item__post);
app.post("/api/estimates/photo-upload", estimates__photo_upload__post);
app.get("/api/estimates/view/:token", estimates__view__token__get);
app.post("/api/estimates/view/:token/approve", estimates__view__token__approve__post);
app.delete("/api/estimates/:estimateId", estimates__estimateId__delete);
app.get("/api/estimates/:estimateId", estimates__estimateId__get);
app.put("/api/estimates/:estimateId", estimates__estimateId__put);
app.post("/api/estimates/:estimateId/approve", estimates__estimateId__approve__post);
app.post("/api/estimates/:estimateId/create-invoice", estimates__estimateId__create_invoice__post);
app.post("/api/estimates/:estimateId/send-email", estimates__estimateId__send_email__post);
app.get("/api/expenses", expenses__get);
app.post("/api/expenses", expenses__post);
app.post("/api/expenses/receipt-upload", expenses__receipt_upload__post);
app.delete("/api/expenses/:expenseId", expenses__expenseId__delete);
app.get("/api/expenses/:expenseId", expenses__expenseId__get);
app.put("/api/expenses/:expenseId", expenses__expenseId__put);
app.get("/api/health", health__get);
app.get("/api/invoices", invoices__get);
app.post("/api/invoices", invoices__post);
app.get("/api/invoices/view/:token", invoices__view__token__get);
app.post("/api/invoices/view/:token/cash-payment", invoices__view__token__cash_payment__post);
app.post("/api/invoices/view/:token/check-payment", invoices__view__token__check_payment__post);
app.post("/api/invoices/view/:token/checkout", invoices__view__token__checkout__post);
app.post("/api/invoices/view/:token/transfer-payment", invoices__view__token__transfer_payment__post);
app.delete("/api/invoices/:invoiceId", invoices__invoiceId__delete);
app.get("/api/invoices/:invoiceId", invoices__invoiceId__get);
app.put("/api/invoices/:invoiceId", invoices__invoiceId__put);
app.post("/api/invoices/:invoiceId/send-email", invoices__invoiceId__send_email__post);
app.get("/api/jobs", jobs__get);
app.post("/api/jobs", jobs__post);
app.delete("/api/jobs/:jobId", jobs__jobId__delete);
app.get("/api/jobs/:jobId", jobs__jobId__get);
app.put("/api/jobs/:jobId", jobs__jobId__put);
app.get("/api/jobs/:jobId/assignments", jobs__jobId__assignments__get);
app.post("/api/jobs/:jobId/assignments", jobs__jobId__assignments__post);
app.delete("/api/jobs/:jobId/assignments/:assignId", jobs__jobId__assignments__assignId__delete);
app.get("/api/jobs/:jobId/checklist", jobs__jobId__checklist__get);
app.post("/api/jobs/:jobId/checklist", jobs__jobId__checklist__post);
app.delete("/api/jobs/:jobId/checklist/:itemId", jobs__jobId__checklist__itemId__delete);
app.put("/api/jobs/:jobId/checklist/:itemId", jobs__jobId__checklist__itemId__put);
app.get("/api/jobs/:jobId/materials", jobs__jobId__materials__get);
app.post("/api/jobs/:jobId/materials", jobs__jobId__materials__post);
app.delete("/api/jobs/:jobId/materials/:materialId", jobs__jobId__materials__materialId__delete);
app.put("/api/jobs/:jobId/materials/:materialId", jobs__jobId__materials__materialId__put);
app.get("/api/jobs/:jobId/photos", jobs__jobId__photos__get);
app.post("/api/jobs/:jobId/photos", jobs__jobId__photos__post);
app.delete("/api/jobs/:jobId/photos/:photoId", jobs__jobId__photos__photoId__delete);
app.get("/api/jobs/:jobId/schedules", jobs__jobId__schedules__get);
app.post("/api/jobs/:jobId/schedules", jobs__jobId__schedules__post);
app.delete("/api/jobs/:jobId/schedules/:schedId", jobs__jobId__schedules__schedId__delete);
app.put("/api/jobs/:jobId/schedules/:schedId", jobs__jobId__schedules__schedId__put);
app.get("/api/jobs/:jobId/stage", jobs__jobId__stage__get);
app.put("/api/jobs/:jobId/stage", jobs__jobId__stage__put);
app.get("/api/material-orders", material_orders__get);
app.post("/api/material-orders", material_orders__post);
app.delete("/api/material-orders/:orderId", material_orders__orderId__delete);
app.put("/api/material-orders/:orderId", material_orders__orderId__put);
app.get("/api/notifications", notifications__get);
app.post("/api/notifications", notifications__post);
app.post("/api/notifications/read-all", notifications__read_all__post);
app.put("/api/notifications/:notifId", notifications__notifId__put);
app.get("/api/payments", payments__get);
app.post("/api/payments", payments__post);
app.get("/api/payments/summary", payments__summary__get);
app.delete("/api/payments/:paymentId", payments__paymentId__delete);
app.put("/api/payments/:paymentId", payments__paymentId__put);
app.get("/api/price-library", price_library__get);
app.post("/api/price-library", price_library__post);
app.post("/api/price-library/import", price_library__import__post);
app.delete("/api/price-library/:itemId", price_library__itemId__delete);
app.put("/api/price-library/:itemId", price_library__itemId__put);
app.get("/api/reports", reports__get);
app.get("/api/scope", scope__get);
app.post("/api/scope", scope__post);
app.delete("/api/scope/:scopeId", scope__scopeId__delete);
app.get("/api/scope/:scopeId", scope__scopeId__get);
app.put("/api/scope/:scopeId", scope__scopeId__put);
app.post("/api/scope/:scopeId/analyze", scope__scopeId__analyze__post);
app.get("/api/scope/:scopeId/change-orders", scope__scopeId__change_orders__get);
app.post("/api/scope/:scopeId/change-orders", scope__scopeId__change_orders__post);
app.delete("/api/scope/:scopeId/change-orders/:coId", scope__scopeId__change_orders__coId__delete);
app.put("/api/scope/:scopeId/change-orders/:coId", scope__scopeId__change_orders__coId__put);
app.get("/api/scope/:scopeId/cost-summary", scope__scopeId__cost_summary__get);
app.put("/api/scope/:scopeId/cost-summary", scope__scopeId__cost_summary__put);
app.get("/api/scope/:scopeId/labor", scope__scopeId__labor__get);
app.post("/api/scope/:scopeId/labor", scope__scopeId__labor__post);
app.delete("/api/scope/:scopeId/labor/:laborId", scope__scopeId__labor__laborId__delete);
app.put("/api/scope/:scopeId/labor/:laborId", scope__scopeId__labor__laborId__put);
app.post("/api/scope/:scopeId/photos", scope__scopeId__photos__post);
app.delete("/api/scope/:scopeId/photos/:photoId", scope__scopeId__photos__photoId__delete);
app.post("/api/scope/:scopeId/send-to-takeoff", scope__scopeId__send_to_takeoff__post);
app.get("/api/scope/:scopeId/tasks", scope__scopeId__tasks__get);
app.post("/api/scope/:scopeId/tasks", scope__scopeId__tasks__post);
app.delete("/api/scope/:scopeId/tasks/:taskId", scope__scopeId__tasks__taskId__delete);
app.put("/api/scope/:scopeId/tasks/:taskId", scope__scopeId__tasks__taskId__put);
app.get("/api/settings/company", settings__company__get);
app.put("/api/settings/company", settings__company__put);
app.get("/api/settings/documents", settings__documents__get);
app.put("/api/settings/documents", settings__documents__put);
app.get("/api/setup", setup__get);
app.post("/api/setup", setup__post);
app.post("/api/stripe/confirm-invoice-payment", stripe__confirm_invoice_payment__post);
app.post("/api/stripe/create-checkout-session", stripe__create_checkout_session__post);
app.post("/api/stripe/invoice-checkout", stripe__invoice_checkout__post);
app.get("/api/stripe/session/:sessionId", stripe__session__sessionId__get);
app.get("/api/supplier-pricing/compare", supplier_pricing__compare__get);
app.get("/api/supplier-pricing/history", supplier_pricing__history__get);
app.post("/api/supplier-pricing/refresh", supplier_pricing__refresh__post);
app.get("/api/supplier-pricing/refresh-history", supplier_pricing__refresh_history__get);
app.get("/api/supplier-pricing/search", supplier_pricing__search__get);
app.post("/api/supplier-pricing/select", supplier_pricing__select__post);
app.get("/api/supplier-pricing/status", supplier_pricing__status__get);
app.get("/api/takeoff", takeoff__get);
app.post("/api/takeoff", takeoff__post);
app.delete("/api/takeoff/:projectId", takeoff__projectId__delete);
app.get("/api/takeoff/:projectId", takeoff__projectId__get);
app.put("/api/takeoff/:projectId", takeoff__projectId__put);
app.post("/api/takeoff/:projectId/analyze", takeoff__projectId__analyze__post);
app.post("/api/takeoff/:projectId/duplicate", takeoff__projectId__duplicate__post);
app.put("/api/takeoff/:projectId/estimate", takeoff__projectId__estimate__put);
app.get("/api/takeoff/:projectId/export-csv", takeoff__projectId__export_csv__get);
app.post("/api/takeoff/:projectId/materials", takeoff__projectId__materials__post);
app.delete("/api/takeoff/:projectId/materials/:materialId", takeoff__projectId__materials__materialId__delete);
app.put("/api/takeoff/:projectId/materials/:materialId", takeoff__projectId__materials__materialId__put);
app.post("/api/takeoff/:projectId/photos", takeoff__projectId__photos__post);
app.delete("/api/takeoff/:projectId/photos/:photoId", takeoff__projectId__photos__photoId__delete);
app.get("/api/vendors", vendors__get);
app.post("/api/vendors", vendors__post);
app.delete("/api/vendors/:vendorId", vendors__vendorId__delete);
app.get("/api/vendors/:vendorId", vendors__vendorId__get);
app.put("/api/vendors/:vendorId", vendors__vendorId__put);
// </api-registrations>

// Error middleware must be registered AFTER the routes it protects; Express
// only passes errors to middleware defined later in the stack.
app.use("/api", apiErrorHandler);

function baseUrl(req: Request): string {
	return `${req.protocol}://${req.hostname}`;
}

type SiteOriginReason = "accepted" | "unparseable" | "bad_scheme" | "system_host";

function siteOriginReason(url: URL | null): SiteOriginReason {
	if (!url) return "unparseable";
	if (url.protocol !== "https:") return "bad_scheme";
	if (isSystemHost(url)) return "system_host";
	return "accepted";
}

function isIpHost(hostname: string | undefined): boolean {
	return isIP((hostname ?? "").replace(/^\[|\]$/g, "")) !== 0;
}

function parseUrl(raw: string): URL | null {
	try {
		return new URL(raw);
	} catch {
		return null;
	}
}

export function preferredOrigin(req: Request): string {
	const raw: string | undefined = req.get("x-airo-site-origin");
	if (!raw) return baseUrl(req);
	const url: URL | null = parseUrl(raw);
	const reason: SiteOriginReason = siteOriginReason(url);
	const origin: string = url && reason === "accepted" ? url.origin : baseUrl(req);
	const headerIsIp: boolean = url !== null && isIpHost(url.hostname);
	const requestIsIp: boolean = isIpHost(req.hostname);
	if (headerIsIp || requestIsIp) {
		const where: string = headerIsIp && requestIsIp ? "both" : headerIsIp ? "header" : "request";
		console.info("ssr.site-origin.ip-literal", `in=${where} reason=${reason}`);
		return origin;
	}
	console.info("ssr.site-origin.observed", `requestOrigin=${baseUrl(req)} preferredOrigin=${origin} reason=${reason}`);
	return origin;
}

/**
 * Absolute URL of the platform's default social image. dev-supervisor sets this
 * header (after stripping any client copy) only when the app has a usable logo
 * or hero image; render() uses it for og:image/twitter:image the page omits.
 */
export function socialPreviewImageUrl(req: Request): string | undefined {
	const path: string | undefined = req.get("x-airo-media-social-preview");
	if (!path || !/^\/airo-assets\/images\/[\w/-]+$/.test(path)) return undefined;
	return `${req.protocol}://${req.hostname}${path}`;
}

function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
	);
}

app.get("/robots.txt", (req, res) => {
	if (isSystemHost(req)) {
		res
			.type("text/plain")
			.set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host")
			.send("User-agent: *\nDisallow: /\n");
		return;
	}
	const base = baseUrl(req);
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${base}/sitemap.xml`,
		"",
	].join("\n");
	res.type("text/plain").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/sitemap.xml", (req, res) => {
	if (isSystemHost(req)) {
		const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n`;
		res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(empty);
		return;
	}
	const base = baseUrl(req);
	const urls = seoRoutes
		.filter((r) => typeof r.path === "string" && r.path.startsWith("/"))
		.map((r) => {
			const loc = `${base}${r.path}`;
			const parts = [`    <loc>${escapeXml(loc)}</loc>`];
			if (r.lastmod) parts.push(`    <lastmod>${escapeXml(r.lastmod)}</lastmod>`);
			if (r.changefreq) parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
			if (r.priority !== undefined)
				parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
			return `  <url>\n${parts.join("\n")}\n  </url>`;
		})
		.join("\n");
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/llms.txt", llmsTxtHandler);

if (import.meta.env.PROD) {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const clientDir = join(__dirname, "client");
	const adSenseRuntimeConfig = loadAdSenseRuntimeConfig(__dirname);
	const indexNowKey = loadIndexNowKey(__dirname);

	registerAdSenseTextRoutes(app, adSenseRuntimeConfig);

	if (indexNowKey !== null) {
		app.get(`/${indexNowKey}.txt`, (_req, res) => {
			res.type("text/plain").set("Cache-Control", "public, max-age=86400").send(indexNowKey);
		});
	}

	app.use(
		express.static(clientDir, {
			index: false,
			setHeaders(res, filePath) {
				res.set(
					"Cache-Control",
					filePath.includes("/assets/")
						? "public, max-age=31536000, immutable"
						: "no-cache",
				);
			},
		}),
	);

	app.use((_req, res, next) => {
		res.set("Cache-Control", "no-cache");
		next();
	});

	let template: string;
	try {
		template = readFileSync(join(clientDir, "index.html"), "utf-8");
	} catch (err) {
		console.error("ssr.template.load-failed", {
			path: join(clientDir, "index.html"),
			error: err instanceof Error ? err.message : String(err),
		});
		process.exit(1);
	}
	if (!template.includes("<!--app-head-->") || !template.includes("<!--app-html-->")) {
		// Fail fast at boot, same as a template load failure above: without
		// markers, every .replace() call on the render path is a no-op and we
		// would serve a shell with no <head> content and no rendered body on
		// every request. Preferring process.exit over a degraded mode ensures
		// an operator notices and fixes the build rather than serving broken
		// SEO-invisible pages indefinitely.
		console.error("ssr.template.markers-missing", {
			hasHead: template.includes("<!--app-head-->"),
			hasHtml: template.includes("<!--app-html-->"),
		});
		process.exit(1);
	}
	const fallbackShell = template
		.replace("<!--app-head-->", "")
		.replace("<!--app-html-->", "");

	// Resolve the SSR module once into a stable render function. A failed
	// load is unrecoverable at runtime - exiting lets the container
	// scheduler restart with a clean slate rather than leaving the server
	// to serve silent 503s indefinitely against a single startup log.
	let renderFn: ((url: string, siteOrigin?: string, socialPreviewImage?: string) => Promise<SsrRenderResult>) | null = null;
	const SSR_MODULE_LOAD_TIMEOUT_MS = 30_000;
	const loadTimeout = setTimeout(() => {
		if (renderFn !== null) return;
		console.error("ssr.module.load-timeout", {
			timeoutMs: SSR_MODULE_LOAD_TIMEOUT_MS,
		});
		process.exit(1);
	}, SSR_MODULE_LOAD_TIMEOUT_MS);
	loadTimeout.unref();
	import("../entry-server").then(
		(mod) => {
			clearTimeout(loadTimeout);
			renderFn = mod.render;
		},
		(err) => {
			clearTimeout(loadTimeout);
			console.error("ssr.module.load-failed", {
				error: err instanceof Error ? err.stack : String(err),
			});
			process.exit(1);
		},
	);

	// ─── Contracts (v2) ────────────────────────────────────────────────────────

	app.get(/.*/, async (req, res, next) => {
		if (req.method !== "GET") return next();
		if (req.path.startsWith("/api")) return next();
		if (extname(req.path)) return next();
		const sendFallback = () =>
			res
				.status(503)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-store")
				.send(fallbackShell);
		if (renderFn === null) {
			// Module not yet resolved; fall back without logging to avoid startup
			// noise before the first render is even possible. A terminal load
			// failure (import reject or 30s timeout) process.exit(1)s from the
			// loader above, so this branch is only the brief warmup window.
			return sendFallback();
		}
		try {
			const socialPreviewImage: string | undefined = socialPreviewImageUrl(req);
			const result = await renderFn(
				req.url,
				`${req.protocol}://${req.hostname}`,
				socialPreviewImage,
			);
			if (result.redirect) {
				// Redirect thrown from a loader/action surfaces as a Response.
				// Forward it so the browser actually navigates to the new URL
				// instead of seeing an empty shell with a stale status.
				res.redirect(result.status, result.redirect);
				return;
			}
			if (!result.html) {
				// A non-redirect Response was thrown from a loader (e.g.
				// `throw new Response(null, { status: 404 })`). renderToString
				// produced no markup, so we have a real status but no body.
				// Log so the case is observable in ops dashboards, and mark
				// no-store so CDNs don't cache an empty page as a valid hit.
				// User-visible 404 / error pages should come from a route
				// errorElement, not from this fallback path.
				console.error("ssr.render.error-response", {
					route: routeLabel(req),
					status: result.status,
				});
				res
					.status(result.status)
					.set("Content-Type", "text/html; charset=utf-8")
					.set("Cache-Control", "no-store")
					.send(fallbackShell);
				return;
			}
			preferredOrigin(req);
			// Per-host SEO injection. System URLs get a noindex meta so
			// crawlers drop them from the index over time; customer-attached
			// hosts get a self-canonical link so search engines treat them
			// as authoritative for the rendered content.
			const seoHead = isSystemHost(req)
				? `<meta name="robots" content="noindex,nofollow">`
				: `<link rel="canonical" href="${escapeXml(`${req.protocol}://${req.hostname}${req.path}`)}">`;
			// Function replacements disable String.replace's $-special sequences
			// ($&, $', $`, $$) so user-authored titles / JSON-LD like
			// "Save $& today" insert literally instead of being interpolated.
			const out = renderSsrDocument(
				template,
				{ ...result, head: seoHead + result.head },
				adSenseRuntimeConfig,
			);
			res
				.status(result.status)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-cache")
				.send(out);
		} catch (err) {
			// 503 surfaces the failure in CDN/monitoring without caching a broken
			// page as success. console.error (not warn) puts it at the right log
			// level for the observability pipeline to alert on.
			console.error("ssr.render.failed", {
					route: routeLabel(req),
					// The stack is dropped even though React annotates it with the failing
					// component tree. A route component or loader throws messages it builds
					// itself, so a thrown value can quote a query parameter or a submitted
					// field, and the message is embedded in the stack. The component tree is
					// not worth sending request data to a shared log.
					error: toLogError(err),
				});
			sendFallback();
		}
	});

	// Last in the stack, so it sees any error the routes above pass on.
	app.use(finalErrorHandler);

	const shutdown = async (signal: string) => {
		console.log(`Got ${signal}, shutting down gracefully...`);
		// Scope the ERR_MODULE_NOT_FOUND suppression to the import() only.
		// A closeConnection() failure that happens to carry the same code
		// (unlikely but possible for wrapped errors) must not be silently
		// swallowed - it indicates a real db-close failure worth logging.
		let mod: { closeConnection?: () => Promise<void> | void } | null = null;
		try {
			const dbClient = "./db/client" + ".js";
			// Source-literal optional module path; no request, environment, or user input reaches import().
			// eslint-disable-next-line no-unsanitized/method
			mod = await import(/* @vite-ignore */ dbClient);
		} catch (error: unknown) {
			const code = (error as { code?: string } | null)?.code;
			if (code !== "ERR_MODULE_NOT_FOUND") {
				console.error("ssr.shutdown.db-import-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		if (mod && typeof mod.closeConnection === "function") {
			try {
				await mod.closeConnection();
				console.log("Database connections closed");
			} catch (error: unknown) {
				console.error("ssr.shutdown.db-close-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		process.exit(0);
	};

	(["SIGTERM", "SIGINT"] as const).forEach((signal) => {
		process.once(signal, () => {
			void shutdown(signal);
		});
	});

	const rawPort = process.env.PORT || "3000";
	const port = parseInt(rawPort, 10);
	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		// parseInt("abc") returns NaN; passing that to app.listen throws
		// synchronously before the server.on("error") handler below can catch
		// it. Fail fast with an actionable log rather than a cryptic crash.
		console.error("ssr.server.invalid-port", { rawPort });
		process.exit(1);
	}
	const host = process.env.HOST || "0.0.0.0";
	const server = app.listen(port, host, () => {
		console.log(`Server listening on http://${host}:${port}`);
		startPriceRefreshScheduler();
	});
	server.timeout = 120000;
	server.keepAliveTimeout = 120000;
	server.headersTimeout = 125000;
	server.on("error", (err: NodeJS.ErrnoException) => {
		console.error("ssr.server.listen-failed", {
			port,
			host,
			code: err.code,
			error: err.message,
		});
		process.exit(1);
	});
}

export default app;
