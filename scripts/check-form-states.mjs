#!/usr/bin/env node
/**
 * Verificação funcional dos estados do formulário de inscrição.
 *
 * Por que existe: os gates de lint/check/build não conseguem provar a regra
 * central da issue #2 — "Inscrição confirmada" só pode aparecer com gravação
 * durável comprovada. Antes, o `catch` do submit chamava `succeed()` de
 * qualquer jeito, então a pessoa lia "confirmada" com a planilha fora do ar.
 * Aqui o endpoint é interceptado via CDP e cada desfecho é conferido na UI e
 * nos eventos de analytics, incluindo a asserção negativa de PII.
 *
 * Uso (precisa de um servidor servindo o build):
 *   node scripts/check-form-states.mjs [BASE_URL]
 *
 * Fora do pre-commit de propósito: sobe um Chrome headless e precisa de
 * servidor. Vive no runbook de QA, ao lado do chrome-geometry.
 */
import * as chromeLauncher from "chrome-launcher";

const BASE = process.argv[2] || "http://localhost:4334";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = await chromeLauncher.launch({
	chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
const t = await (
	await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, {
		method: "PUT",
	})
).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const handlers = [];
ws.addEventListener("message", (e) => {
	const m = JSON.parse(e.data);
	if (m.id !== undefined) {
		const p = pending.get(m.id);
		pending.delete(m.id);
		if (m.error) p.reject(new Error(m.error.message));
		else p.resolve(m.result);
	} else {
		for (const h of handlers) h(m);
	}
});
const send = (method, params = {}) =>
	new Promise((res, rej) => {
		const i = ++id;
		pending.set(i, { resolve: res, reject: rej });
		ws.send(JSON.stringify({ id: i, method, params }));
	});
const evalp = async (e) => {
	const r = await send("Runtime.evaluate", {
		expression: e,
		returnByValue: true,
		awaitPromise: true,
	});
	if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
	return r.result.value;
};

let ok = true;
const check = (label, pass, detail = "") => {
	console.log(
		`${pass ? "PASS" : "FAIL"}  ${label}${pass || !detail ? "" : `\n      ${detail}`}`,
	);
	if (!pass) ok = false;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/inscricao*" }] });
await send("Emulation.setDeviceMetricsOverride", {
	width: 1440,
	height: 1000,
	deviceScaleFactor: 1,
	mobile: false,
});

let stub = null;
let requests = [];
let warmups = 0;
handlers.push(async (m) => {
	if (m.method !== "Fetch.requestPaused") return;
	const { requestId, request } = m.params;
	// GET = aquecimento do Apps Script ao carregar (não é captura).
	if (request.method === "GET") {
		warmups++;
		await send("Fetch.fulfillRequest", { requestId, responseCode: 204 });
		return;
	}
	requests.push(JSON.parse(request.postData ?? "{}"));
	if (!stub) {
		await send("Fetch.failRequest", {
			requestId,
			errorReason: "BlockedByClient",
		});
		return;
	}
	await send("Fetch.fulfillRequest", {
		requestId,
		responseCode: stub.code,
		responseHeaders: [{ name: "Content-Type", value: "application/json" }],
		body: Buffer.from(stub.body).toString("base64"),
	});
});

const fill = `(async()=>{
  const f=document.getElementById("registration-form");
  const set=(n,v)=>{const el=f.querySelector('[name="'+n+'"]');el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));};
  set("name","QA Teste"); set("email","qa@exemplo.local"); set("phone","62999990909");
  set("experience","De 1 a 3 anos"); set("revenue","De R$ 5 mil a R$ 10 mil");
  const c=f.querySelector('[name="consent"]'); c.checked=true; c.dispatchEvent(new Event("change",{bubbles:true}));
  const record=(entry)=>{const items=JSON.parse(sessionStorage.getItem("__qa_events")||"[]");items.push(entry);sessionStorage.setItem("__qa_events",JSON.stringify(items));};
  window.dataLayer=window.dataLayer||[];
  const orig=window.dataLayer.push.bind(window.dataLayer);
  window.dataLayer.push=(o)=>{record({dl:{event:o.event,lead_id:o.lead_id}});return orig(o);};
  window.gtag=(...a)=>record({ga:a});
  f.querySelector('button[data-cro="form_submit_click"]').click();
  return 1;})()`;

const snapshot = `(()=>{
  const f=document.getElementById("registration-form");
  const err=document.getElementById("registration-error");
  const suc=document.getElementById("registration-success");
  const alt=document.getElementById("form-whatsapp-alt");
  const btn=f?.querySelector('button[data-cro="form_submit_click"]');
  const events=JSON.parse(sessionStorage.getItem("__qa_events")||"[]");
  const group=document.querySelector('[data-thank-you-cta]');
  return {path:location.pathname,marker:sessionStorage.getItem("mesa_inscricao_confirmada"),
    title:document.title,description:document.querySelector('meta[name="description"]')?.content,
    neutralHidden:document.querySelector('[data-thank-you-state="neutral"]')?.hidden,
    confirmedHidden:document.querySelector('[data-thank-you-state="confirmed"]')?.hidden,
    groupHref:group?.getAttribute("href"),groupLabel:group?.textContent?.trim(),
    groupVisible:!!group?.getClientRects().length,
    fallbackGroupVisible:!!document.querySelector('[data-cro="success_join_group"]')?.getClientRects().length,
    backHref:document.querySelector('[data-thank-you-back]')?.getAttribute("href"),
    formHidden:f?.hidden,errHidden:err?.hidden,sucHidden:suc?.hidden,altHidden:alt?.hidden,
    btnDisabled:btn?.disabled,btnLabel:btn?.textContent?.trim(),ariaBusy:f?.getAttribute("aria-busy"),
    nameKept:f?.querySelector('[name="name"]')?.value,
    dl:JSON.stringify(events.filter(e=>e.dl).map(e=>e.dl)),
    ga:JSON.stringify(events.filter(e=>e.ga).map(e=>e.ga))};})()`;

const scenario = async (
	label,
	s,
	formFill = fill,
	previousConfirmation = false,
) => {
	stub = s;
	requests = [];
	await send("Page.navigate", { url: BASE });
	await sleep(2200);
	await evalp(
		'sessionStorage.removeItem("__qa_events");sessionStorage.removeItem("mesa_inscricao_confirmada");1',
	);
	if (previousConfirmation) {
		await evalp('sessionStorage.setItem("mesa_inscricao_confirmada","1");1');
	}
	await evalp(formFill);
	await sleep(2400);
	const r = await evalp(snapshot);
	console.log(`\n--- ${label} ---`);
	return r;
};

// Consentimento ausente não deve iniciar captura nem emitir sucesso.
await send("Page.navigate", { url: BASE });
await sleep(2200);
// O cold start do Apps Script (20–35s) precisa começar antes do envio.
check("aquecimento: GET ao carregar, sem captura", warmups === 1);
await evalp(fill.replace("c.checked=true", "c.checked=false"));
await sleep(250);
check("sem consentimento: nenhuma captura", requests.length === 0);
const invalid = await evalp(snapshot);
check("sem consentimento: sem sucesso", invalid.sucHidden === true);
check("sem consentimento: sem lead_submit", !/lead_submit/.test(invalid.dl));

// 1. Sucesso durável
let r = await scenario("201 persisted:true", {
	code: 201,
	body: JSON.stringify({
		ok: true,
		persisted: true,
		leadId: "lead_abc123",
		created: true,
	}),
});
check(
	"sucesso: navega para a página de obrigado confirmada",
	/^\/obrigado\/?$/.test(r.path) &&
		r.confirmedHidden === false &&
		r.neutralHidden === true,
	JSON.stringify(r),
);
check(
	"sucesso: CTA exato do grupo",
	r.groupHref ===
		"https://chat.whatsapp.com/JnhXq4xULMY3Rl9VCwLGR7?mode=gi_t" &&
		r.groupLabel === "Entrar no grupo vip!",
);
check(
	"sucesso: lead_submit uma vez",
	(r.dl.match(/lead_submit/g) ?? []).length === 1,
);
check(
	"sucesso: lead_submit com lead_id do servidor",
	/"lead_id":"lead_abc123"/.test(r.dl),
	r.dl,
);
check(
	"sucesso: SEM PII no dataLayer",
	!/lead_name|lead_email|lead_phone|qa@exemplo/.test(r.dl),
	r.dl,
);
check("sucesso: generate_lead disparado", /generate_lead/.test(r.ga), r.ga);
check(
	"sucesso: eventos de analytics sem duplicação",
	(r.ga.match(/generate_lead/g) ?? []).length === 1 &&
		(r.ga.match(/form_submit_success/g) ?? []).length === 1,
	r.ga,
);
await send("Page.reload");
await sleep(800);
const reloaded = await evalp(snapshot);
check(
	"recarga: confirmação mantida na mesma aba",
	/^\/obrigado\/?$/.test(reloaded.path) &&
		reloaded.confirmedHidden === false &&
		reloaded.neutralHidden === true,
);
const captured = requests[0];
check("payload: captura única", requests.length === 1);
check(
	"payload: qualificadores rotulados apenas em profession",
	captured?.contact?.profession ===
		"Tempo de atuação: De 1 a 3 anos; Faturamento mensal: De R$ 5 mil a R$ 10 mil" &&
		!("experience" in captured.contact) &&
		!("revenue" in captured.contact),
);
check("payload: landingPath da home", captured?.meta?.landingPath === "/");
check(
	"analytics: sem qualificadores",
	!/De 1 a 3 anos|De R\$ 5 mil|Tempo de atuação|Faturamento mensal/.test(
		r.dl + r.ga,
	),
);

// Qualificadores opcionais: a inscrição continua válida sem essas respostas.
r = await scenario(
	"201 sem qualificadores",
	{
		code: 201,
		body: JSON.stringify({
			ok: true,
			persisted: true,
			leadId: "lead_optional",
		}),
	},
	fill.replace(
		'set("experience","De 1 a 3 anos"); set("revenue","De R$ 5 mil a R$ 10 mil");',
		"",
	),
);
check(
	"opcionais: inscrição confirmada",
	/^\/obrigado\/?$/.test(r.path) && r.confirmedHidden === false,
);
check(
	"opcionais: profession omitido",
	requests.length === 1 && !("profession" in requests[0].contact),
);

// 2. 503 sem destino durável
r = await scenario("503 lead_store_not_configured", {
	code: 503,
	body: JSON.stringify({
		ok: false,
		persisted: false,
		error: "lead_store_not_configured",
	}),
});
check("503: painel de ERRO visível", r.errHidden === false, JSON.stringify(r));
check("503: SEM painel de sucesso", r.sucHidden === true);
check("503: form continua visível", r.formHidden === false);
check(
	"503: dados digitados preservados",
	r.nameKept === "QA Teste",
	r.nameKept,
);
check("503: botão reabilitado", r.btnDisabled === false);
check("503: NENHUM lead_submit", !/lead_submit/.test(r.dl), r.dl);
check("503: NENHUM generate_lead", !/generate_lead/.test(r.ga), r.ga);
check("503: sem navegação", r.path === "/" && r.marker === null);
check(
	"503: form_submit_error com motivo",
	/form_submit_error/.test(r.ga),
	r.ga,
);

// O timeout real da planilha não prova que a gravação terminou.
r = await scenario("502 store_timeout", {
	code: 502,
	body: JSON.stringify({ ok: false, persisted: false, error: "store_timeout" }),
});
check(
	"timeout: erro, dados preservados e sem redirecionamento",
	r.errHidden === false &&
		r.nameKept === "QA Teste" &&
		r.path === "/" &&
		r.marker === null,
);
check("timeout: nenhum lead_submit", !/lead_submit/.test(r.dl), r.dl);
r = await scenario(
	"502 após inscrição anterior",
	{
		code: 502,
		body: JSON.stringify({
			ok: false,
			persisted: false,
			error: "store_timeout",
		}),
	},
	fill,
	true,
);
check(
	"timeout: prova anterior descartada no novo envio",
	r.marker === null && r.path === "/",
);

// 3. 201 mas sem prova de persistência (persisted ausente + id não-lead_)
r = await scenario("201 ok:true sem persisted e sem lead_", {
	code: 201,
	body: JSON.stringify({ ok: true, leadId: "tmp-999" }),
});
check(
	"sem prova: painel de ERRO visível",
	r.errHidden === false,
	JSON.stringify(r),
);
check("sem prova: SEM painel de sucesso", r.sucHidden === true);
check("sem prova: NENHUM lead_submit", !/lead_submit/.test(r.dl), r.dl);
check("sem prova: sem navegação", r.path === "/" && r.marker === null);

// 4. Corpo não-JSON
r = await scenario("502 com HTML", { code: 502, body: "<html>gateway</html>" });
check("HTML: painel de ERRO visível", r.errHidden === false, JSON.stringify(r));
check("HTML: NENHUM lead_submit", !/lead_submit/.test(r.dl), r.dl);
check("HTML: sem navegação", r.path === "/" && r.marker === null);

// 5. Mesmo um id lead_ não substitui confirmação explícita de persistência.
r = await scenario("201 sem persisted mas leadId lead_", {
	code: 201,
	body: JSON.stringify({ ok: true, leadId: "lead_legacy" }),
});
check(
	"sem persisted: sucesso recusado mesmo com leadId",
	r.sucHidden === true && r.errHidden === false,
	JSON.stringify(r),
);

check("sem persisted: nenhum lead_submit", !/lead_submit/.test(r.dl));
check("sem persisted: sem navegação", r.path === "/" && r.marker === null);

const storageBlocked = fill.replace(
	"  f.querySelector('button[data-cro=\"form_submit_click\"]').click();",
	`  const setItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key==="mesa_inscricao_confirmada")throw new DOMException("bloqueado","SecurityError");
    return setItem.call(this,key,value);
  };
  f.querySelector('button[data-cro="form_submit_click"]').click();`,
);
r = await scenario(
	"201 com storage bloqueado",
	{
		code: 201,
		body: JSON.stringify({ ok: true, persisted: true, leadId: "lead_storage" }),
	},
	storageBlocked,
);
check(
	"storage bloqueado: painel de sucesso e grupo sem navegação",
	r.path === "/" &&
		r.marker === null &&
		r.sucHidden === false &&
		r.fallbackGroupVisible,
);

await send("Page.navigate", { url: new URL("/obrigado", BASE).href });
await sleep(1000);
const direct = await evalp(snapshot);
check(
	"acesso direto: orientação neutra sem convite",
	/^\/obrigado\/?$/.test(direct.path) &&
		direct.neutralHidden === false &&
		direct.confirmedHidden === true &&
		direct.groupVisible === false &&
		direct.backHref === "/#inscricao" &&
		!/confirmad|você está na lista/i.test(
			`${direct.title} ${direct.description}`,
		),
	JSON.stringify(direct),
);

ws.close();
chrome.kill();
console.log(ok ? "\nESTADOS OK" : "\nESTADOS FALHOU");
process.exit(ok ? 0 : 1);
