// Web App simulado em localhost, sem I/O externo. Uso: bun scripts/check-lead-store.ts
// Reproduz as falhas medidas no Apps Script real (404 no echo, `unauthorized`
// com o segredo certo, execução pendurada) e prova que o cliente de
// leads-store.ts se recupera sem perder a inscrição — e que /api/inscricao
// responde sem esperar CRM/webhook/CAPI quando roda na Vercel.
import assert from "node:assert/strict";
import {
	callSheets,
	captureLead,
	LeadStoreError,
} from "../src/lib/server/leads-store";
import { POST } from "../src/pages/api/inscricao";

// Nenhum destino real: o Bun carrega .env.local sozinho, então tudo que
// sairia para Meta, CRM ou webhook é apagado ou apontado para o simulador.
for (const key of [
	"META_CAPI_ACCESS_TOKEN",
	"META_CAPI_TEST_EVENT_CODE",
	"PUBLIC_FB_PIXEL_ID",
	"NEONDASH_CRM_INBOUND_TOKEN",
	"NEONDASH_CRM_INBOUND_URL",
	"LEAD_NOTIFY_WEBHOOK_URL",
	"LEAD_NOTIFY_WEBHOOK_SECRET",
]) {
	delete process.env[key];
}

type Step = { html?: boolean; delayMs?: number; body?: unknown };
let steps: Step[] = [];
let hits = 0;
let inflight = 0;
let maxInflight = 0;
const sideEffects: string[] = [];

const server = Bun.serve({
	port: 0,
	async fetch(req) {
		// CRM e webhook simulados, lentos de propósito.
		const path = new URL(req.url).pathname;
		if (path === "/crm" || path === "/hook") {
			await Bun.sleep(1500);
			sideEffects.push(path);
			return Response.json({ leadId: 1 });
		}
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

// 4. `unauthorized` persistente é segredo errado: para na 3ª ocorrência.
reset([
	{ body: { ok: false, error: "unauthorized" } },
	{ body: { ok: false, error: "unauthorized" } },
	{ body: { ok: false, error: "unauthorized" } },
	{ body: { ok: false, error: "unauthorized" } },
]);
await rejectsWith(captureLead(payload), "store_unauthorized");
assert.equal(hits, 3);

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
const hedged = await callSheets<{ version: number }>("dashboard");
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

// 8b. Ping (aquecimento) também vai numa tentativa só.
reset([{ html: true }, { body: { ok: true, data: {} } }]);
await rejectsWith(callSheets("ping"), "store_error");
assert.equal(hits, 1);

// 8c. Cold start real de 13:17 (produção): várias falhas seguidas. As
// reposições continuam até o orçamento — um teto de 5 no total falhava aqui.
process.env.SHEETS_TIMEOUT_MS = "400";
reset([
	{ html: true },
	{ html: true },
	{ html: true },
	{ html: true },
	{ html: true },
	{ html: true },
	captured(new Date().toISOString(), true),
]);
assert.equal((await captureLead(payload)).created, true);
assert.equal(hits, 7);

// 9. /api/inscricao na Vercel: responde assim que a planilha confirma; CRM e
// webhook (1,5s cada no simulador) terminam depois, via waitUntil.
process.env.NEONDASH_CRM_INBOUND_TOKEN = "token-sintetico";
process.env.NEONDASH_CRM_INBOUND_URL = `http://localhost:${server.port}/crm`;
process.env.LEAD_NOTIFY_WEBHOOK_URL = `http://localhost:${server.port}/hook`;
const vercelContext = Symbol.for("@vercel/request-context");
const background: Promise<unknown>[] = [];
Reflect.set(globalThis, vercelContext, {
	get: () => ({ waitUntil: (p: Promise<unknown>) => background.push(p) }),
});
const post = () =>
	POST({
		request: new Request("http://localhost/api/inscricao", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		}),
	} as Parameters<typeof POST>[0]);

reset([captured(new Date().toISOString(), true)]);
sideEffects.length = 0;
let postStarted = Date.now();
const fast = await post();
const fastMs = Date.now() - postStarted;
const fastBody = (await fast.json()) as Record<string, unknown>;
assert.equal(fast.status, 201);
assert.equal(fastBody.persisted, true);
assert.ok(fastMs < 1000, `resposta esperou efeitos: ${fastMs}ms`);
assert.equal(background.length, 1);
assert.equal(sideEffects.length, 0, "efeitos ainda não terminaram");
await background[0];
assert.deepEqual(sideEffects.sort(), ["/crm", "/hook"]);

// Fora da Vercel (sem contexto), os efeitos seguem dentro da requisição.
Reflect.deleteProperty(globalThis, vercelContext);
reset([captured(new Date().toISOString(), true)]);
sideEffects.length = 0;
postStarted = Date.now();
const inline = await post();
assert.equal(inline.status, 201);
assert.ok(Date.now() - postStarted >= 1400, "sem Vercel deve aguardar");
assert.equal(sideEffects.length, 2);
assert.ok("crm" in ((await inline.json()) as Record<string, unknown>));

// Cada falha deixa um log técnico, sem PII.
assert.ok(
	!JSON.stringify(warnings).includes("teste@exemplo.local"),
	"log de tentativa não pode conter PII",
);

server.stop(true);
console.log("LEAD STORE OK");
