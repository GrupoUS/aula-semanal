#!/usr/bin/env node
/**
 * Prova geométrica de que o chrome inferior (aviso de cookies + CTA fixo +
 * botão flutuante) nunca sobrepõe nem torna inacessível uma zona de conversão.
 *
 * Por que existe: o banner de consentimento já foi "consertado" duas vezes por
 * offset (`bottom-0` -> `md:bottom-0` -> `bottom: 5rem`) e quebrou nas duas.
 * A razão é aritmética: com `vh` a altura da viewport, `H` a altura do chrome e
 * `B(e)` a base do elemento protegido em coordenadas de documento,
 *
 *     e fica ocluido  <=>  scrollY < B(e) + H - vh
 *
 * Em scrollY = 0 isso exige `B(e) + H <= vh`. Em 1440x1000 o submit termina em
 * y=995: sobram 5px. Nenhum offset resolve. A garantia real vem de revelar o
 * chrome so a partir de um limiar derivado da geometria medida em runtime.
 * Este script falsifica essa garantia.
 *
 * Interseção de retângulo sozinha é o que um offset bem ajustado satisfaz.
 * Por isso toda asserção visível também faz HIT-TEST (`elementFromPoint`):
 * é o que dobra z-index, `pointer-events`, `visibility` e `inert` numa
 * afirmação só — "dá para clicar", não "não encosta".
 *
 * Uso (precisa de um servidor rodando — `bun run preview` ou `bun run dev`):
 *   node scripts/chrome-geometry.mjs [BASE_URL]
 *
 * Disciplina de baseline: rode contra o HEAD ANTES de corrigir. Ele PRECISA
 * falhar. Um gate que passa no build sabidamente quebrado não prova nada.
 */

import * as chromeLauncher from "chrome-launcher";

const BASE_URL = process.argv[2] || "http://localhost:4321";
const CONSENT_KEY = "otb_aula_cookie_consent";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const VIEWPORTS = [
	{ name: "390x844", width: 390, height: 844, mobile: true },
	{ name: "768x1024", width: 768, height: 1024, mobile: true },
	{ name: "1440x1000", width: 1440, height: 1000, mobile: false },
];

/** Elementos nomeados: os quatro atores do requisito da issue #2. */
const NAMED = {
	consent: "#cookie-consent",
	consentAccept: '[data-consent-action="accept"]',
	consentReject: '[data-consent-action="reject"]',
	heroCta:
		'[data-conversion-zone][href="#inscricao"], #inicio [data-conversion-zone]',
	submit: "#registration-form button[type=submit]",
	stickyCta: "[data-sticky-cta] a",
	waFloat: "[data-float-wa]",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- CDP ---- */

class Cdp {
	constructor(ws) {
		this.ws = ws;
		this.id = 0;
		this.pending = new Map();
		this.listeners = [];
		ws.addEventListener("message", (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id !== undefined) {
				const entry = this.pending.get(msg.id);
				if (!entry) return;
				this.pending.delete(msg.id);
				if (msg.error)
					entry.reject(new Error(`${msg.error.message} (${entry.method})`));
				else entry.resolve(msg.result);
				return;
			}
			for (const fn of this.listeners) fn(msg);
		});
	}

	static async connect(port) {
		const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
			method: "PUT",
		});
		const target = await res.json();
		const ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((resolve, reject) => {
			ws.addEventListener("open", resolve, { once: true });
			ws.addEventListener("error", reject, { once: true });
		});
		return new Cdp(ws);
	}

	send(method, params = {}) {
		const id = ++this.id;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject, method });
			this.ws.send(JSON.stringify({ id, method, params }));
		});
	}

	once(event) {
		return new Promise((resolve) => {
			const fn = (msg) => {
				if (msg.method !== event) return;
				this.listeners = this.listeners.filter((l) => l !== fn);
				resolve(msg.params);
			};
			this.listeners.push(fn);
		});
	}

	/**
	 * `awaitPromise` liga para o probe poder usar rAF sem race de layout.
	 *
	 * O retry existe por causa do dev server: o Vite dispara full reload ao
	 * reotimizar dependências, o contexto de execução morre no meio da sonda e
	 * o CDP responde "Promise was collected". Não é falha de asserção — é o
	 * servidor se mexendo debaixo do teste.
	 */
	async evaluate(expression, attempt = 0) {
		try {
			const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
				expression,
				returnByValue: true,
				awaitPromise: true,
			});
			if (exceptionDetails)
				throw new Error(exceptionDetails.text ?? "evaluate failed");
			return result.value;
		} catch (err) {
			const transient =
				/Promise was collected|Execution context was destroyed|Cannot find context/.test(
					err.message ?? "",
				);
			if (!transient || attempt >= 3) throw err;
			await sleep(600);
			return this.evaluate(expression, attempt + 1);
		}
	}
}

/* -------------------------------------------------------------- probe ---- */

/**
 * Roda DENTRO da página. Devolve, para cada elemento nomeado e para toda
 * `[data-conversion-zone]`: retângulo de viewport, se está pintado, e o
 * hit-test resolvido contra o próprio elemento.
 */
const PROBE = (
	named,
	sync = false,
	waitStable = false,
) => `(${sync ? "" : "async "}() => {
  // setTimeout, NÃO requestAnimationFrame: em headless o rAF de uma aba que o
  // compositor considera invisível pode nunca disparar, a promise nunca
  // resolve e o CDP responde "Promise was collected". setTimeout sempre corre.
  //
  // Com Emulation.setScriptExecutionDisabled os timers da página também
  // param — por isso o modo sem-JS usa a variante SÍNCRONA. Uma sonda async ali
  // nunca assentaria, e o sintoma seria idêntico ao de uma falha real.
  ${sync ? "" : "await new Promise(r => setTimeout(r, 60));"}
  ${
		waitStable
			? `// scroll-behavior: smooth — o navegador leva centenas de ms para
     // levar o foco à viewport. Esperar a POSIÇÃO parar é a única medida
     // honesta; um sleep fixo acusa "fora da tela" em salto longo.
     {
       let last = -1, stable = 0;
       for (let i = 0; i < 40 && stable < 3; i++) {
         await new Promise(r => setTimeout(r, 40));
         const sy = Math.round(window.scrollY);
         stable = sy === last ? stable + 1 : 0;
         last = sy;
       }
     }`
			: ""
	}
  const named = ${JSON.stringify(named)};
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const shownOf = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    if (el.hasAttribute("hidden")) return false;
    if (el.closest("[inert]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Hit-test no centro do retângulo VISÍVEL (clamp na viewport): um elemento
  // meio fora da tela ainda tem um ponto clicável, e é ele que interessa.
  const hitOf = (el) => {
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    const x = Math.min(vw - 1, Math.max(0, (Math.max(0, r.left) + Math.min(vw, r.right)) / 2));
    const y = Math.min(vh - 1, Math.max(0, (Math.max(0, r.top) + Math.min(vh, r.bottom)) / 2));
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return "offscreen";
    const t = document.elementFromPoint(x, y);
    if (!t) return "none";
    if (t === el || el.contains(t) || t.contains(el)) return "self";
    return (t.tagName || "?").toLowerCase() + (t.id ? "#" + t.id : "") +
      (t.className && typeof t.className === "string" ? "." + t.className.trim().split(/\\s+/)[0] : "");
  };

  const describe = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      shown: shownOf(el), hit: hitOf(el),
    };
  };

  const out = { vh, vw, scrollY: Math.round(window.scrollY), els: {}, zones: [] };
  for (const key of Object.keys(named)) out.els[key] = describe(document.querySelector(named[key]));

  const stack = document.getElementById("bottom-chrome");
  document.querySelectorAll("[data-conversion-zone]").forEach((el, i) => {
    if (stack && stack.contains(el)) return;
    const d = describe(el);
    d.key = "zone" + i + ":" + (el.id || el.getAttribute("data-cro") || el.tagName.toLowerCase());
    out.zones.push(d);
  });

  const cs = getComputedStyle(document.documentElement);
  out.stackH = parseFloat(cs.getPropertyValue("--bottom-stack-h")) || 0;
  out.bodyPadBottom = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
  out.scrollPadBottom = parseFloat(cs.scrollPaddingBottom) || 0;
  out.scrollHeight = document.documentElement.scrollHeight;
  // Só páginas que montam um CTA fixo têm chrome inferior a reservar
  // (Layout.astro: Astro.slots.has("bottom-cta")). /termos, /politica e /404
  // carregam apenas a linha do aviso de cookies.
  out.hasBottomChrome = document.documentElement.classList.contains("has-bottom-chrome");
  out.running = document.getAnimations
    ? document.getAnimations().filter(a => a.playState === "running").length
    : 0;
  const ae = document.activeElement;
  out.active = ae && ae !== document.body
    ? { tag: ae.tagName.toLowerCase(),
        id: ae.id || null,
        label: (ae.getAttribute("aria-label") || ae.textContent || "").trim().slice(0, 40),
        cls: (typeof ae.className === "string" ? ae.className : "").slice(0, 60),
        ariaHidden: !!ae.closest("[aria-hidden='true']"),
        hit: hitOf(ae),
        rect: (() => { const r = ae.getBoundingClientRect();
          return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
        inCollapsed: !!ae.closest(".chrome-row:not(.is-visible)") }
    : null;
  return out;
})()`;

/* --------------------------------------------------------- assertions ---- */

const results = [];
const record = (viewport, mode, name, ok, detail = "") =>
	results.push({ viewport, mode, name, ok, detail });

const rect = (d) => (d?.shown ? d : null);
const intersects = (a, b) => {
	const ra = rect(a);
	const rb = rect(b);
	if (!ra || !rb) return false;
	return (
		ra.x < rb.x + rb.w &&
		rb.x < ra.x + ra.w &&
		ra.y < rb.y + rb.h &&
		rb.y < ra.y + ra.h
	);
};
const fmt = (d) =>
	d ? `[${d.x},${d.y} ${d.w}x${d.h} shown=${d.shown} hit=${d.hit}]` : "ausente";

/* -------------------------------------------------------------- runner --- */

async function runCase(cdp, viewport, mode) {
	const { width, height, mobile } = viewport;
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 1,
		mobile,
	});
	await cdp.send("Emulation.setEmulatedMedia", {
		features: mode.reduced
			? [{ name: "prefers-reduced-motion", value: "reduce" }]
			: [{ name: "prefers-reduced-motion", value: "no-preference" }],
	});
	await cdp.send("Emulation.setScriptExecutionDisabled", {
		value: !!mode.noJs,
	});

	// Origem correta antes de mexer em localStorage.
	await cdp.send("Page.navigate", { url: BASE_URL });
	await cdp.once("Page.loadEventFired");
	await cdp.evaluate(
		`try{${
			mode.consented
				? `localStorage.setItem(${JSON.stringify(CONSENT_KEY)},"granted")`
				: `localStorage.removeItem(${JSON.stringify(CONSENT_KEY)})`
		}}catch(e){};1`,
	);
	await cdp.send("Page.reload", { ignoreCache: true });
	await cdp.once("Page.loadEventFired");
	await sleep(700);

	const label = `${mode.consented ? "consent-ok" : "consent-pendente"}${
		mode.reduced ? " reduced" : ""
	}${mode.noJs ? " sem-JS" : ""}`;
	const vp = viewport.name;

	/* --- F: sem JS ------------------------------------------------------- */
	if (mode.noJs) {
		const p = await cdp.evaluate(PROBE(NAMED, true));
		record(
			vp,
			label,
			"F1 aviso não aparece sem JS",
			!p.els.consent?.shown,
			fmt(p.els.consent),
		);
		if (p.hasBottomChrome) {
			record(
				vp,
				label,
				"F2 CTA fixo visível sem JS",
				!!p.els.stickyCta?.shown,
				fmt(p.els.stickyCta),
			);
			record(
				vp,
				label,
				"F3 reserva do body >= 80px",
				p.bodyPadBottom >= 80,
				`pad=${p.bodyPadBottom}`,
			);
		} else {
			// Página sem CTA fixo (/termos, /politica-de-privacidade, /404): não há
			// barra para mostrar nem reserva a fazer. Reservar aqui seria o bug.
			record(
				vp,
				label,
				"F2/F3 sem chrome inferior: nenhuma reserva",
				p.bodyPadBottom < 8,
				`pad=${p.bodyPadBottom}`,
			);
		}
		return;
	}

	/* --- A: repouso em y = 0 --------------------------------------------- */
	await cdp.evaluate("window.scrollTo(0,0)");
	await sleep(450);
	const a = await cdp.evaluate(PROBE(NAMED));

	if (!mode.consented) {
		record(
			vp,
			label,
			"A1 aviso x CTA do hero",
			!intersects(a.els.consent, a.els.heroCta),
			`aviso ${fmt(a.els.consent)} cta ${fmt(a.els.heroCta)}`,
		);
		record(
			vp,
			label,
			"A2 aviso x submit",
			!intersects(a.els.consent, a.els.submit),
			`aviso ${fmt(a.els.consent)} submit ${fmt(a.els.submit)}`,
		);
		record(
			vp,
			label,
			"A3 aviso x CTA fixo",
			!intersects(a.els.consent, a.els.stickyCta),
			`aviso ${fmt(a.els.consent)} sticky ${fmt(a.els.stickyCta)}`,
		);
		if (a.els.consent?.shown) {
			record(
				vp,
				label,
				"A6 botões do aviso clicáveis",
				a.els.consentAccept?.hit === "self" &&
					a.els.consentReject?.hit === "self",
				`aceitar ${fmt(a.els.consentAccept)} recusar ${fmt(a.els.consentReject)}`,
			);
		}
	}
	// Fora da tela não é oclusão — é só estar abaixo da dobra. O que importa é
	// que, ESTANDO visível, o elemento receba o clique; a alcançabilidade de
	// toda zona é provada em B3.
	const clickableOrOff = (d) => !d || d.hit === "offscreen" || d.hit === "self";
	const offNote = (d) =>
		d && d.hit === "offscreen" ? `fora da dobra ${fmt(d)}` : fmt(d);
	record(
		vp,
		label,
		"A4 CTA do hero clicável (ou fora da dobra)",
		clickableOrOff(a.els.heroCta),
		offNote(a.els.heroCta),
	);
	record(
		vp,
		label,
		"A5 submit clicável (ou fora da dobra)",
		clickableOrOff(a.els.submit),
		offNote(a.els.submit),
	);

	/* --- B: varredura de scroll ------------------------------------------ */
	const max = Math.max(0, a.scrollHeight - a.vh);
	const samples = [];
	for (let i = 0; i <= 12; i += 1) samples.push(Math.round((max * i) / 12));
	samples.push(
		Math.round(a.vh * 0.8) - 1,
		Math.round(a.vh * 0.8) + 1,
		1,
		80,
		200,
	);
	const sweep = [...new Set(samples.filter((y) => y >= 0 && y <= max))].sort(
		(x, y) => x - y,
	);

	let disjoint = true;
	let disjointDetail = "";
	let reserveOk = true;
	let reserveDetail = "";
	const reached = new Set();
	const heights = new Set();

	for (const y of sweep) {
		await cdp.evaluate(`window.scrollTo(0,${y})`);
		await sleep(160);
		const p = await cdp.evaluate(PROBE(NAMED));

		const chrome = [
			["aviso", p.els.consent],
			["ctaFixo", p.els.stickyCta],
			["waFloat", p.els.waFloat],
		];
		for (let i = 0; i < chrome.length && disjoint; i += 1) {
			for (let j = i + 1; j < chrome.length && disjoint; j += 1) {
				if (intersects(chrome[i][1], chrome[j][1])) {
					disjoint = false;
					disjointDetail = `y=${y} ${chrome[i][0]} ${fmt(chrome[i][1])} x ${chrome[j][0]} ${fmt(chrome[j][1])}`;
				}
			}
		}

		if (reserveOk && p.bodyPadBottom + 0.5 < p.stackH) {
			reserveOk = false;
			reserveDetail = `y=${y} pad=${p.bodyPadBottom} < stack=${p.stackH}`;
		}

		for (const z of p.zones) if (z.hit === "self") reached.add(z.key);
		heights.add(p.scrollHeight);

		// Zona de conversão nunca pode ficar ENCOBERTA pelo chrome — visível e
		// bloqueada é o defeito; fora da tela é apenas fora da tela.
		if (disjoint) {
			for (const z of p.zones) {
				if (!z.shown || z.hit === "offscreen" || z.hit === "self") continue;
				const blockedByChrome =
					intersects(z, p.els.consent) ||
					intersects(z, p.els.stickyCta) ||
					intersects(z, p.els.waFloat);
				if (blockedByChrome) {
					disjoint = false;
					disjointDetail =
						`y=${y} vh=${p.vh} zona ${z.key} ${fmt(z)} coberta | ` +
						`aviso ${fmt(p.els.consent)} | ctaFixo ${fmt(p.els.stickyCta)} | ` +
						`waFloat ${fmt(p.els.waFloat)}`;
				}
			}
		}
	}

	record(
		vp,
		label,
		"B1 chrome disjunto em todo scroll",
		disjoint,
		disjointDetail,
	);
	record(vp, label, "B4 reserva >= altura da pilha", reserveOk, reserveDetail);
	// A altura do documento CRESCE de propósito quando a pilha abre: a reserva do
	// body é `--bottom-stack-h`. O que não pode acontecer é a reserva realimentar
	// a medição — por isso o critério é a AMPLITUDE ser compatível com a altura
	// da pilha, não a altura ser constante.
	const hs = [...heights];
	const spread = Math.max(...hs) - Math.min(...hs);
	record(
		vp,
		label,
		"B5 crescimento do documento limitado à pilha",
		spread <= 400,
		`amplitude=${spread}px alturas=${hs.join(",")}`,
	);

	const totalZones = a.zones.length;
	record(
		vp,
		label,
		"B3 toda zona de conversão alcançável",
		totalZones === 0 || reached.size === totalZones,
		`${reached.size}/${totalZones} alcançadas`,
	);

	/* --- C: âncoras ------------------------------------------------------ */
	const ANCHORS = [
		"#virada",
		"#aula",
		"#para-quem",
		"#metodo",
		"#proximo-passo",
		"#inscricao",
		"#faq",
	];
	let anchorsOk = true;
	let anchorDetail = "";
	for (const anchor of ANCHORS) {
		const info = await cdp.evaluate(`(async () => {
      const el = document.querySelector(${JSON.stringify(anchor)});
      if (!el) return { missing: true };
      // Limpa o hash antes: reatribuir o MESMO hash é no-op e a medição sairia
      // de onde a varredura de scroll parou.
      // NÃO chamar scrollTo(0,0) aqui: com scroll-behavior: smooth ele ainda
      // está animando quando o hash é setado, os dois scrolls brigam e o
      // scrollTo vence — foi o que produziu top=2036 com a página no topo.
      history.replaceState(null, "", location.pathname);
      await new Promise(r => setTimeout(r, 80));
      location.hash = ${JSON.stringify(anchor)};
      // scroll-behavior: smooth — espera a posição PARAR de mudar em vez de
      // apostar num timeout fixo.
      // Piso de 400ms antes de olhar estabilidade: com scroll-behavior smooth
      // a posição fica em 0 por alguns frames depois de setar o hash, e sair
      // cedo mediria a página parada no topo (foi o que deu top=2036).
      await new Promise(r => setTimeout(r, 400));
      let last = -1, stable = 0;
      for (let i = 0; i < 60 && stable < 3; i++) {
        await new Promise(r => setTimeout(r, 50));
        const y = Math.round(window.scrollY);
        stable = y === last ? stable + 1 : 0;
        last = y;
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      return {
        top: Math.round(r.top),
        vh: window.innerHeight,
        stackH: parseFloat(cs.getPropertyValue("--bottom-stack-h")) || 0,
        padTop: parseFloat(cs.scrollPaddingTop) || 0,
      };
    })()`);
		if (info.missing) continue;
		if (info.top < info.padTop - 4 || info.top > info.vh - info.stackH) {
			anchorsOk = false;
			anchorDetail = `${anchor} top=${info.top} fora de [${info.padTop},${info.vh - info.stackH}]`;
			break;
		}
	}
	record(vp, label, "C1 âncoras livres do chrome", anchorsOk, anchorDetail);

	/* --- D: teclado ------------------------------------------------------ */
	// Recarrega antes de tabular: o teste de âncoras move o foco para o alvo do
	// hash, e continuar dali mediria "primeiro Tab" a partir do meio da página.
	// O localStorage sobrevive ao reload, então o estado de consentimento fica.
	await cdp.send("Page.reload", { ignoreCache: false });
	await cdp.once("Page.loadEventFired");
	await sleep(700);
	await cdp.evaluate(
		"window.scrollTo(0,0); history.replaceState(null,'',location.pathname); 1",
	);
	let kbOk = true;
	let kbDetail = "";
	for (let i = 0; i < 60 && kbOk; i += 1) {
		await cdp.send("Input.dispatchKeyEvent", {
			type: "rawKeyDown",
			windowsVirtualKeyCode: 9,
			key: "Tab",
			code: "Tab",
		});
		await cdp.send("Input.dispatchKeyEvent", {
			type: "keyUp",
			windowsVirtualKeyCode: 9,
			key: "Tab",
			code: "Tab",
		});
		// A sonda espera o scroll ASSENTAR antes de medir: o navegador leva o foco
		// à viewport sozinho (sequential focus navigation scrolling) e, com
		// scroll-behavior: smooth, isso leva centenas de ms num salto longo.
		const p = await cdp.evaluate(PROBE(NAMED, false, true));
		if (!p.active) continue;
		if (p.active.inCollapsed) {
			kbOk = false;
			kbDetail = `D2 tab ${i}: foco em linha colapsada (${p.active.tag}#${p.active.id})`;
		} else if (p.active.hit === "offscreen") {
			kbOk = false;
			kbDetail =
				`D1 tab ${i}: foco fora da tela <${p.active.tag}> ` +
				`id=${p.active.id} rect=${p.active.rect} ariaHidden=${p.active.ariaHidden} ` +
				`cls="${p.active.cls}" texto="${p.active.label}"`;
		}
	}
	record(
		vp,
		label,
		"D1/D2 foco nunca fora da tela nem em linha colapsada",
		kbOk,
		kbDetail,
	);

	/* --- E: reduced motion ------------------------------------------------ */
	if (mode.reduced) {
		await cdp.evaluate("window.scrollTo(0,0)");
		await sleep(600);
		const p = await cdp.evaluate(PROBE(NAMED));
		record(
			vp,
			label,
			"E1 nenhuma animação rodando",
			p.running === 0,
			`rodando=${p.running}`,
		);
	}
}

/* ---------------------------------------------------------------- main --- */

async function main() {
	try {
		const probe = await fetch(BASE_URL, { method: "HEAD" });
		if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
		// Aquece: o Vite reotimiza dependências no primeiro GET real e dispara
		// full reload. Melhor pagar isso antes de começar a medir.
		await fetch(BASE_URL);
		await sleep(2500);
	} catch (err) {
		console.error(
			`${RED}Servidor não respondeu em ${BASE_URL}${RESET}\n` +
				`  Suba um: ${DIM}bun run preview${RESET} (ou passe a URL: node scripts/chrome-geometry.mjs <url>)\n` +
				`  ${DIM}${err.message}${RESET}`,
		);
		process.exitCode = 1;
		return;
	}

	const chrome = await chromeLauncher.launch({
		chromeFlags: [
			"--headless=new",
			"--no-sandbox",
			"--disable-gpu",
			"--hide-scrollbars",
			// Mantém o renderer acordado: aba "invisível" throttla timers e rAF,
			// e a medição vira corrida.
			"--disable-renderer-backgrounding",
			"--disable-backgrounding-occluded-windows",
			"--disable-background-timer-throttling",
		],
	});
	let cdp;
	try {
		cdp = await Cdp.connect(chrome.port);
		await cdp.send("Page.enable");
		await cdp.send("Runtime.enable");
		await cdp.send("DOM.enable");

		const MODES = [
			{ consented: false },
			{ consented: true },
			{ consented: false, reduced: true },
			{ consented: false, noJs: true },
		];
		for (const viewport of VIEWPORTS) {
			for (const mode of MODES) {
				const label = `${mode.consented ? "consent-ok" : "consent-pendente"}${
					mode.reduced ? " reduced" : ""
				}${mode.noJs ? " sem-JS" : ""}`;
				process.stdout.write(
					`${DIM}· medindo ${viewport.name} · ${label}${RESET}\n`,
				);
				try {
					await runCase(cdp, viewport, mode);
				} catch (err) {
					// Um caso que explode não pode esconder os outros — vira FAIL
					// nomeado, com a mensagem original, e a varredura continua.
					record(
						viewport.name,
						label,
						"runner",
						false,
						err.message ?? String(err),
					);
				}
			}
		}
	} finally {
		try {
			cdp?.ws.close();
		} catch {}
		chrome.kill();
	}

	let failed = 0;
	let current = "";
	for (const r of results) {
		const head = `${r.viewport} · ${r.mode}`;
		if (head !== current) {
			current = head;
			console.log(`\n${DIM}${head}${RESET}`);
		}
		if (r.ok) {
			console.log(`  ${GREEN}PASS${RESET}  ${r.name}`);
		} else {
			failed += 1;
			console.log(
				`  ${RED}FAIL${RESET}  ${r.name}${r.detail ? `\n        ${DIM}${r.detail}${RESET}` : ""}`,
			);
		}
	}
	console.log(
		failed
			? `\n${RED}GEOMETRIA FALHOU — ${failed} de ${results.length} asserções.${RESET}`
			: `\n${GREEN}GEOMETRIA OK — ${results.length} asserções.${RESET}`,
	);
	if (failed) process.exitCode = 1;
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
