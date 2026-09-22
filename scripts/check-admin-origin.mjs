/**
 * Regressão do POST nativo: no-referrer removia a origem do próprio formulário.
 * Uso: bun scripts/check-admin-origin.mjs http://127.0.0.1:4342
 * Usa usuário vazio após trim, sem consultar credenciais ou persistir dados.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import * as chromeLauncher from "chrome-launcher";

const base = new URL(process.argv[2] || "http://127.0.0.1:4342");
assert.ok(
	["127.0.0.1", "localhost", "[::1]"].includes(base.hostname),
	"Execute apenas contra um servidor local.",
);
const endpoint = new URL("/api/admin/login", base).href;
const attackerForm = `<form method="post" action="${endpoint}"><input name="username" value=" "><input name="password" value="invalid-origin-probe"><button type="submit">Enviar</button></form>`;
const foreign = createServer((_request, response) => {
	response.writeHead(200, { "Content-Type": "text/html" });
	response.end(attackerForm);
});
await new Promise((resolve) => foreign.listen(0, "127.0.0.1", resolve));
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
	const waitFor = async (predicate) => {
		const deadline = Date.now() + 10_000;
		while (Date.now() < deadline) {
			const result = await predicate();
			if (result) return result;
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
		throw new Error("Timeout aguardando o formulário ou sua resposta HTTP.");
	};
	await send("Page.enable");
	await send("Network.enable");
	const version = await send("Browser.getVersion");
	console.log(`Browser: ${version.product}`);
	const foreignAddress = foreign.address();
	assert.ok(foreignAddress && typeof foreignAddress !== "string");
	const cases = [
		{ name: "same-origin", url: new URL("/admin", base).href, status: 303 },
		{
			name: "cross-origin",
			url: `http://127.0.0.1:${foreignAddress.port}/`,
			status: 403,
		},
		{
			name: "opaque-origin",
			url: `data:text/html,${encodeURIComponent(attackerForm)}`,
			status: 403,
		},
	];
	for (const scenario of cases) {
		events.length = 0;
		await send("Page.navigate", { url: scenario.url });
		await waitFor(() =>
			evaluate('Boolean(document.querySelector("form input[name=password]"))'),
		);
		const button = await evaluate(`(() => {
			const form = document.querySelector('form');
			form.querySelector('[name=username]').value = ' ';
			form.querySelector('[name=password]').value = 'invalid-origin-probe';
			const button = form.querySelector('button[type=submit]');
			button.scrollIntoView();
			const rect = button.getBoundingClientRect();
			return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
		})()`);
		await send("Input.dispatchMouseEvent", {
			type: "mousePressed",
			button: "left",
			clickCount: 1,
			...button,
		});
		await send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			button: "left",
			clickCount: 1,
			...button,
		});
		const response = await waitFor(() =>
			events
				.map(
					(event) => event.params?.redirectResponse || event.params?.response,
				)
				.find((entry) => entry?.url === endpoint),
		);
		const request = events.find(
			(event) =>
				event.method === "Network.requestWillBeSent" &&
				event.params.request.url === endpoint &&
				event.params.request.method === "POST",
		)?.params.request;
		console.log(
			`${scenario.name}: Origin=${request?.headers.Origin}, HTTP ${response.status}`,
		);
		assert.equal(response.status, scenario.status, scenario.name);
		if (scenario.name === "same-origin") {
			assert.equal(request.headers.Origin, base.origin);
			await waitFor(() =>
				evaluate(
					'location.pathname + location.search === "/admin?error=invalid" && document.querySelector("[role=alert]")?.textContent.includes("Usuário ou senha inválidos.")',
				),
			);
		}
	}
	console.log(
		"PASS: POST nativo preserva origem local e bloqueia origem estrangeira/opaca.",
	);
} finally {
	ws?.close();
	chrome.kill();
	await new Promise((resolve) => foreign.close(resolve));
}
