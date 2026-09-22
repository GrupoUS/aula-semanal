/**
 * Regressão do link de recuperação em documento novo e na página já aberta.
 * Uso: bun scripts/check-admin-recovery.mjs http://127.0.0.1:4342
 * Exige recuperação configurada. Não envia formulários nem consulta o token.
 */
import assert from "node:assert/strict";
import * as chromeLauncher from "chrome-launcher";

const base = new URL(process.argv[2] || "http://127.0.0.1:4342");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
const page = new URL("/admin/recuperar", base).href;
const token = "a".repeat(64);
const chrome = await chromeLauncher.launch({
	chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
let ws;
try {
	const target = await (
		await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, {
			method: "PUT",
		})
	).json();
	ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve) =>
		ws.addEventListener("open", resolve, { once: true }),
	);
	let id = 0;
	const pending = new Map();
	const events = [];
	ws.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		if (message.id !== undefined) {
			const entry = pending.get(message.id);
			pending.delete(message.id);
			if (message.error) entry.reject(new Error(message.error.message));
			else entry.resolve(message.result);
		} else events.push(message);
	});
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const requestId = ++id;
			pending.set(requestId, { resolve, reject });
			ws.send(JSON.stringify({ id: requestId, method, params }));
		});
	const evaluate = async (expression) => {
		const result = await send("Runtime.evaluate", {
			expression,
			returnByValue: true,
		});
		assert.equal(result.exceptionDetails, undefined);
		return result.result.value;
	};
	const waitFor = async (predicate, label) => {
		const deadline = Date.now() + 10_000;
		while (Date.now() < deadline) {
			if (await predicate()) return;
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
		throw new Error(`Timeout: ${label}`);
	};
	await send("Page.enable");
	await send("Runtime.enable");
	await send("Network.enable");
	const version = await send("Browser.getVersion");
	console.log(`Browser: ${version.product}`);
	await send("Page.navigate", { url: page });
	await waitFor(
		() => events.some((event) => event.method === "Page.loadEventFired"),
		"carregamento inicial",
	);
	await waitFor(
		() => evaluate('document.readyState === "complete"'),
		"módulos iniciais executados",
	);
	const initialDocument = await evaluate("performance.timeOrigin");
	assert.equal(
		await evaluate('document.querySelector("#reset-password")?.hidden'),
		true,
		"recuperação precisa estar configurada",
	);
	for (const sameDocument of [true, false]) {
		if (!sameDocument) {
			events.length = 0;
			await send("Page.navigate", { url: "about:blank" });
			await waitFor(
				() => events.some((event) => event.method === "Page.loadEventFired"),
				"documento vazio",
			);
		}
		events.length = 0;
		await send("Page.navigate", { url: `${page}#token=${token}` });
		await waitFor(
			() =>
				events.some(
					(event) =>
						event.method ===
						(sameDocument
							? "Page.navigatedWithinDocument"
							: "Page.loadEventFired"),
				),
			"navegação para o link",
		);
		await waitFor(
			() => evaluate('location.hash === ""'),
			"remoção do token da URL",
		);
		if (sameDocument) {
			assert.equal(await evaluate("performance.timeOrigin"), initialDocument);
			assert.equal(
				events.some(
					(event) =>
						event.method === "Network.requestWillBeSent" &&
						event.params.type === "Document",
				),
				false,
				"hashchange não deve depender de reload/HMR",
			);
		}
		const state = await evaluate(`({
			requestHidden: document.querySelector('#request-recovery')?.hidden,
			resetHidden: document.querySelector('#reset-password')?.hidden,
			tokenMatches: document.querySelector('#reset-token')?.value === '${token}',
		})`);
		assert.deepEqual(state, {
			requestHidden: true,
			resetHidden: false,
			tokenMatches: true,
		});
		assert.equal(
			events.some((event) => event.method === "Runtime.exceptionThrown"),
			false,
		);
		assert.equal(
			events.some(
				(event) =>
					event.method === "Network.requestWillBeSent" &&
					event.params.request.method === "POST",
			),
			false,
		);
		console.log(`PASS: ${sameDocument ? "mesmo documento" : "documento novo"}`);
	}
} finally {
	ws?.close();
	chrome.kill();
}
