// Web App simulado em localhost, sem I/O externo. Uso: bun scripts/check-lead-store.ts
// Reproduz as falhas medidas no Apps Script real (404 no echo, `unauthorized`
// com o segredo certo, execução pendurada) e prova que o cliente de
// leads-store.ts se recupera sem perder a inscrição.
import assert from "node:assert/strict";
import {
	callSheets,
	captureLead,
	LeadStoreError,
} from "../src/lib/server/leads-store";

type Step = { html?: boolean; delayMs?: number; body?: unknown };
let steps: Step[] = [];
let hits = 0;
let inflight = 0;
let maxInflight = 0;

const server = Bun.serve({
	port: 0,
	async fetch(req) {
		hits++;
		inflight++;
		maxInflight = Math.max(maxInflight, inflight);
		const step = steps.shift() ?? { body: { ok: true, data: {} } };
		try {
			// Cliente cancelou (timeout ou outra tentativa venceu): encerra já.
			if (step.delayMs) {
				await new Promise<void>((resolve) => {
					const timer = setTimeout(resolve, step.delayMs);
					req.signal.addEventListener("abort", () => {
						clearTimeout(timer);
						resolve();
					});
				});
			}
			if (step.html) {
				return new Response("<html><title>Página não encontrada</title>", {
					status: 404,
					headers: { "Content-Type": "text/html" },
				});
			}
			return Response.json(step.body);
		} finally {
			inflight--;
		}
	},
});

process.env.SHEETS_WEBAPP_URL = `http://localhost:${server.port}/exec`;
process.env.SHEETS_SHARED_SECRET = "segredo-sintetico";
process.env.SHEETS_TIMEOUT_MS = "400";
const warnings: unknown[] = [];
console.warn = (...args: unknown[]) => warnings.push(args);

const reset = (next: Step[]) => {
	steps = next;
	hits = 0;
	maxInflight = 0;
};
const lead = (createdAt: string) => ({
	id: "lead_sintetico",
	name: "Pessoa Teste",
	email: "teste@exemplo.local",
	phone: "11999999999",
	consent: true,
	status: "novo",
	createdAt,
	updatedAt: new Date().toISOString(),
});
const captured = (createdAt: string, created: boolean) => ({
	body: { ok: true, data: { lead: lead(createdAt), created } },
});
const payload = {
	contact: {
		name: "Pessoa Teste",
		email: "teste@exemplo.local",
		phone: "11999999999",
		consentGiven: true as const,
		consentTimestamp: new Date().toISOString(),
	},
	meta: { utm: {} },
};
const rejectsWith = async (p: Promise<unknown>, code: string) => {
	const err = await p.then(
		() => null,
		(e: unknown) => e,
	);
	assert.ok(err instanceof LeadStoreError, "esperava LeadStoreError");
	assert.equal(err.code, code);
};

// 1. 404 no echo: a 1ª execução gravou, a resposta se perdeu; o retry devolve
// `created: false`, mas a linha nasceu nesta operação → ainda é lead novo.
reset([{ html: true }, captured(new Date().toISOString(), false)]);
const r1 = await captureLead(payload);
assert.equal(hits, 2);
assert.equal(r1.lead.id, "lead_sintetico");
assert.equal(r1.created, true);

// 2. Reinscrição de verdade (linha antiga) continua `created: false`.
reset([captured("2026-01-01T00:00:00.000Z", false)]);
assert.equal((await captureLead(payload)).created, false);

// 3. `unauthorized` esporádico com o segredo certo: uma nova tentativa basta.
reset([
	{ body: { ok: false, error: "unauthorized" } },
	captured(new Date().toISOString(), true),
]);
assert.equal((await captureLead(payload)).created, true);
assert.equal(hits, 2);

// 4. `unauthorized` persistente é segredo errado: para na 2ª tentativa.
reset([
	{ body: { ok: false, error: "unauthorized" } },
	{ body: { ok: false, error: "unauthorized" } },
	{ body: { ok: false, error: "unauthorized" } },
]);
await rejectsWith(captureLead(payload), "store_unauthorized");
assert.equal(hits, 2);

// 5. Payload inválido é determinístico: nenhuma nova tentativa.
reset([{ body: { ok: false, error: "invalid_payload" } }]);
await rejectsWith(captureLead(payload), "store_error");
assert.equal(hits, 1);

// 6. Execução pendurada: aborta no teto por tentativa e tenta de novo.
reset([{ delayMs: 1500 }, captured(new Date().toISOString(), true)]);
assert.equal((await captureLead(payload)).created, true);
assert.equal(hits, 2);
await Bun.sleep(1200); // deixa a execução abortada terminar no simulador

// 7. Hedging: a 1ª chamada fica lenta (dentro do teto); após 5s sai outra em
// paralelo, que responde primeiro e vence. A lenta é cancelada.
process.env.SHEETS_TIMEOUT_MS = "30000";
reset([{ delayMs: 20000 }, { body: { ok: true, data: { version: 4 } } }]);
const hedgeStarted = Date.now();
const hedged = await callSheets<{ version: number }>("ping");
const hedgeMs = Date.now() - hedgeStarted;
assert.equal(hedged.version, 4);
assert.equal(hits, 2);
assert.equal(maxInflight, 2);
assert.ok(hedgeMs >= 4900 && hedgeMs < 8000, `hedge em ${hedgeMs}ms`);
await Bun.sleep(100);
assert.equal(inflight, 0, "tentativa perdedora precisa ser cancelada");

// 8. Admin nunca repete nem paraleliza (consome token / envia e-mail).
reset([{ html: true }, { body: { ok: true, data: {} } }]);
await rejectsWith(callSheets("adminAuth", {}), "store_error");
assert.equal(hits, 1);

// Cada falha deixa um log técnico, sem PII.
assert.ok(
	!JSON.stringify(warnings).includes("teste@exemplo.local"),
	"log de tentativa não pode conter PII",
);

server.stop(true);
console.log("LEAD STORE OK");
