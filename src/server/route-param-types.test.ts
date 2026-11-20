import express, { type Request, type Response } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

// Handlers in the shape the develop prompt teaches, registered as entry.ts does;
// `npm run type-check` compiles the registrations and the tests check runtime values.
function getItem(req: Request<{ id: string }>, res: Response): void {
	const id: string = req.params.id;
	res.json({ id });
}

function getFile(req: Request<{ path: string[] }>, res: Response): void {
	res.json({ path: req.params.path.join("/") });
}

async function request(path: string): Promise<unknown> {
	const app = express();
	app.get("/items/:id", getItem);
	app.get("/files/*path", getFile);
	const server: Server = app.listen(0);
	try {
		const { port } = server.address() as AddressInfo;
		const res = await fetch(`http://127.0.0.1:${port}${path}`);
		return await res.json();
	} finally {
		server.close();
	}
}

describe("Express route parameter types", () => {
	it("receives a named route parameter as a string", async () => {
		expect(await request("/items/42")).toEqual({ id: "42" });
	});

	it("receives a wildcard parameter as an array", async () => {
		expect(await request("/files/a/b/c")).toEqual({ path: "a/b/c" });
	});
});
