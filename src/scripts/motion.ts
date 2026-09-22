/**
 * Motor de movimento da landing — registro visual OTB v2.
 *
 * Dono ÚNICO de todo trabalho visual dirigido por scroll: barra de progresso,
 * fade do hero, parallax, sticky CTA e recolhimento do botão flutuante. Um só
 * listener de `scroll` (passivo, throttled por requestAnimationFrame).
 * O listener de tracking (scroll-depth + [data-cro]) vive em Layout.astro e
 * não é tocado aqui — mexer em tracking exige aprovação.
 *
 * Contrato de atributos (o CSS correspondente está em src/styles/global.css):
 *
 *   data-reveal="up|left|right|scale|mask|wipe" + data-reveal-delay="1..10"
 *   data-enter="1..8"
 *   data-hero-fade
 *   data-parallax data-speed="0.05..0.2"
 *   data-tilt
 *   data-marquee (+ --marquee-dur inline no elemento)
 *   data-sticky-cta / data-float-wa
 *   #bottom-chrome > .chrome-row[data-chrome-row] > .chrome-row-clip
 *                                                 > .chrome-row-content
 *   data-conversion-zone         (elemento que a pilha nunca pode ocluir)
 *   <html data-consent-pending>  (escrito pelo script inline do <head>)
 *   <html data-consent-forced>   (reabertura pelo rodapé — ignora o limiar)
 *   --bottom-stack-h             (medida publicada em <html>)
 *   evento "bottomchrome:change" (pedido de remedição)
 *
 * Progressive enhancement: sem JS o CSS deixa tudo visível e estático. Sob
 * `prefers-reduced-motion: reduce` cada primitiva vira no-op — requisito duro.
 * Todo bloco degrada em silêncio; nada de `throw` no topo do módulo.
 */

const REDUCED =
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FINE_POINTER =
	typeof window.matchMedia !== "function" ||
	window.matchMedia("(pointer: fine)").matches;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/* ---------- (1) reveal on scroll ---------- */

const initReveal = () => {
	const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
	if (!items.length) return;

	const revealAll = () => {
		for (const el of items) el.classList.add("revealed");
	};

	if (typeof IntersectionObserver === "undefined") {
		revealAll();
		return;
	}

	try {
		const observer = new IntersectionObserver(
			(entries, obs) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("revealed");
					obs.unobserve(entry.target);
				}
			},
			{ rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
		);
		for (const el of items) observer.observe(el);
	} catch {
		revealAll();
	}
};

/* ---------- (2) cascata de entrada no load ---------- */

const initEnter = () => {
	const items = document.querySelectorAll<HTMLElement>("[data-enter]");
	if (!items.length) return;
	// Dois frames: o primeiro garante que o estado inicial (opacity 0) foi
	// pintado, senão o navegador colapsa a transição e a cascata não aparece.
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			for (const el of items) el.classList.add("entered");
		});
	});
};

/* ---------- (3) marquee ---------- */

const initMarquee = () => {
	const tracks = document.querySelectorAll<HTMLElement>("[data-marquee]");
	if (!tracks.length || REDUCED) return;
	for (const track of tracks) {
		const kids = Array.from(track.children);
		if (!kids.length) continue;
		// A cópia é puramente visual: leitor de tela lê a lista uma única vez.
		for (const kid of kids) {
			const clone = kid.cloneNode(true) as HTMLElement;
			clone.setAttribute("aria-hidden", "true");
			clone.removeAttribute("id");
			track.appendChild(clone);
		}
		track.classList.add("marquee-ready");
	}
};

/* ---------- (4) tilt 3D ---------- */

const initTilt = () => {
	if (REDUCED || !FINE_POINTER) return;
	const cards = document.querySelectorAll<HTMLElement>("[data-tilt]");
	for (const card of cards) {
		card.addEventListener("pointermove", (ev) => {
			const rect = card.getBoundingClientRect();
			const px = (ev.clientX - rect.left) / rect.width - 0.5;
			const py = (ev.clientY - rect.top) / rect.height - 0.5;
			card.style.transitionDuration = "80ms";
			card.style.transform = `perspective(1000px) rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 5).toFixed(2)}deg) translateY(-4px)`;
		});
		card.addEventListener("pointerleave", () => {
			// Volta à curva editorial e limpa o transform inline: o elemento
			// retoma as próprias regras de CSS (playbook § 3.1).
			card.style.transitionDuration = "";
			card.style.transform = "";
		});
	}
};

/* ---------- (5) chrome inferior: pilha medida + limiar derivado ---------- */

/**
 * Por que a pilha CEDE em vez de ter um offset.
 *
 * Com `vh` a altura da viewport, `H` a altura do chrome e `B(e)` a base do
 * elemento protegido em coordenadas de documento:
 *
 *     e fica ocluído  <=>  scrollY < B(e) + H - vh
 *
 * Em scrollY = 0 isso exige `B(e) + H <= vh`. Em 1440x1000 o submit termina em
 * y=995: sobram 5px. Não existe offset — embaixo OU em cima, porque uma banda
 * no topo empurra B(e) pelo mesmo H — que satisfaça a desigualdade. Foi por
 * isso que as duas correções anteriores quebraram.
 *
 * Um limiar fixo também não basta, e o gate de geometria provou: ele protege
 * só a PRIMEIRA dobra. Em 768x1024, com scroll em 820, o submit sobe para a
 * faixa de baixo e o aviso passa por cima dele (872..920 contra 860..940).
 * Qualquer elemento fixo embaixo cobre o que rola por baixo dele.
 *
 * Então a regra é dinâmica e vale para TODO scroll: a pilha só aparece quando
 * NENHUMA zona de conversão está dentro da faixa que ela ocuparia. Em
 * coordenadas de documento essa faixa é [y + vh - H, y + vh], e a checagem é
 * aritmética pura por frame — as posições das zonas ficam em cache e são
 * remedidas só em resize/ResizeObserver, então não há leitura de layout no loop.
 *
 * O CTA fixo obedece à mesma regra: uma barra "ir para o formulário" não tem
 * por que cobrir justamente o botão de enviar o formulário.
 */
const initBottomChrome = () => {
	const stack = document.getElementById("bottom-chrome");
	if (!stack) return null;

	const rows = Array.from(stack.querySelectorAll<HTMLElement>(".chrome-row"));
	if (!rows.length) return null;

	const contentOf = (row: HTMLElement) =>
		row.querySelector<HTMLElement>(".chrome-row-content");

	/**
	 * Altura natural da linha, lida do NETO: com `grid-template-rows: 0fr` o
	 * `.chrome-row-clip` mede 0, enquanto o conteúdo dentro dele mede o que mede.
	 */
	const rowHeight = (row: HTMLElement) => contentOf(row)?.offsetHeight ?? 0;

	/**
	 * Base do elemento em coordenadas de DOCUMENTO, por offsetTop acumulado.
	 * `getBoundingClientRect()` mentiria aqui: [data-hero-fade] translada a
	 * coluna do hero em até 46px durante o scroll e [data-enter] também
	 * transforma — o limiar passaria a depender da própria animação.
	 */
	const docBottom = (el: HTMLElement) => {
		let top = 0;
		let node: HTMLElement | null = el;
		while (node) {
			top += node.offsetTop;
			node = node.offsetParent as HTMLElement | null;
		}
		return top + el.offsetHeight;
	};

	const consentRow =
		rows.find((r) => r.dataset.chromeRow === "consent") ?? null;
	const ctaRow = rows.find((r) => r.dataset.chromeRow === "cta") ?? null;

	/** Zonas protegidas em coordenadas de DOCUMENTO, medidas fora do loop. */
	let zoneSpans: Array<{ top: number; bottom: number }> = [];
	let hConsent = 0;
	let hTotal = 0;
	/** Encostar não é cobrir, mas 2px de folga evitam brigar com arredondamento
	 *  de subpixel em zoom fracionário. */
	const PAD = 2;

	const measure = () => {
		hConsent = consentRow ? rowHeight(consentRow) : 0;
		hTotal = rows.reduce((sum, r) => sum + rowHeight(r), 0);

		zoneSpans = [];
		const zones = document.querySelectorAll<HTMLElement>(
			"[data-conversion-zone]",
		);
		for (const el of zones) {
			if (stack.contains(el)) continue; // o CTA da própria pilha
			const bottom = docBottom(el);
			zoneSpans.push({ top: bottom - el.offsetHeight, bottom });
		}
	};

	/**
	 * Alguma zona de conversão está dentro da faixa de altura `h` colada no fundo
	 * da viewport? Só aritmética — nada de getBoundingClientRect por frame.
	 */
	const bandBlocked = (y: number, vh: number, h: number) => {
		if (h <= 0) return false;
		const bandTop = y + vh - h - PAD;
		const bandBottom = y + vh + PAD;
		for (const zone of zoneSpans) {
			if (zone.top < bandBottom && bandTop < zone.bottom) return true;
		}
		return false;
	};

	const publish = () => {
		const h = rows.reduce(
			(sum, r) => sum + (r.classList.contains("is-visible") ? rowHeight(r) : 0),
			0,
		);
		document.documentElement.style.setProperty(
			"--bottom-stack-h",
			`${Math.round(h)}px`,
		);
	};

	const setRow = (row: HTMLElement | null, on: boolean) => {
		if (!row || row.classList.contains("is-visible") === on) return false;
		row.classList.toggle("is-visible", on);
		row.toggleAttribute("inert", !on);
		return true;
	};

	/** Devolve se QUALQUER linha da pilha está aberta — é o que o flutuante do
	 *  WhatsApp precisa saber para recolher. Recolher só quando o CTA fixo abria
	 *  deixava o flutuante sobrepondo o aviso de cookies. */
	const update = (y: number) => {
		const root = document.documentElement;
		const vh = window.innerHeight || document.documentElement.clientHeight;
		const pending = root.hasAttribute("data-consent-pending");
		const forced = root.hasAttribute("data-consent-forced");

		// O CTA fixo mantém o gatilho de produto (80% da primeira viewport) e cede
		// quando cobriria uma zona de conversão.
		const ctaOn = y >= vh * 0.8 && !bandBlocked(y, vh, hTotal);
		// Com os dois abertos, o aviso ocupa a faixa acima do CTA.
		const consentBand = ctaOn ? hTotal : hConsent;
		// `forced` = a pessoa pediu o aviso pelo botão do rodapé. Aí a exibição
		// não é oclusão inesperada, e o pedido dela vence a cessão.
		const consentOn = pending && (forced || !bandBlocked(y, vh, consentBand));

		let changed = setRow(consentRow, consentOn);
		changed = setRow(ctaRow, ctaOn) || changed;
		if (changed) publish();
		return rows.some((r) => r.classList.contains("is-visible"));
	};

	// Linhas nascem colapsadas e inert: sem isto o CTA fixo segue tabulável fora
	// da tela, que é o bug que o `translateY(100%)` escondia.
	for (const row of rows) row.toggleAttribute("inert", true);

	const remeasure = () => {
		measure();
		update(window.scrollY || 0);
		publish();
	};

	// ResizeObserver no CONTEÚDO (que não anima), nunca no container: observar o
	// container geraria uma remedição por frame durante a própria transição.
	if (typeof ResizeObserver !== "undefined") {
		const ro = new ResizeObserver(remeasure);
		for (const row of rows) {
			const content = contentOf(row);
			if (content) ro.observe(content);
		}
	}
	window.addEventListener("bottomchrome:change", remeasure);
	window.addEventListener("resize", remeasure, { passive: true });
	document.fonts?.ready.then(remeasure).catch(() => {});

	measure();
	return update;
};

/* ---------- (6) loop de scroll ---------- */

const initScroll = () => {
	const bar = document.querySelector<HTMLElement>("[data-scroll-progress]");
	const heroFade = document.querySelector<HTMLElement>("[data-hero-fade]");
	const floatWa = document.querySelector<HTMLElement>("[data-float-wa]");
	const parallax = REDUCED
		? []
		: Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
	// Chamado daqui, e não registrado no array do start(), para que o mesmo
	// frame seja dono da leitura e da escrita de layout.
	const updateChrome = initBottomChrome();

	if (!bar && !heroFade && !floatWa && !updateChrome && !parallax.length)
		return;

	let ticking = false;

	const frame = () => {
		ticking = false;
		const doc = document.documentElement;
		const viewport = window.innerHeight || doc.clientHeight;
		const y = window.scrollY || doc.scrollTop || 0;

		if (bar) {
			const max = doc.scrollHeight - doc.clientHeight;
			bar.style.transform = `scaleX(${max > 0 ? clamp01(y / max) : 0})`;
		}

		if (heroFade && !REDUCED) {
			const p = clamp01(y / Math.max(1, viewport * 0.9));
			heroFade.style.opacity = String(1 - p * 0.9);
			heroFade.style.transform = `translate3d(0, ${(p * 46).toFixed(1)}px, 0)`;
		}

		// O flutuante do WhatsApp entra depois de 400px e sai exatamente quando a
		// pilha inferior aparece: dois CTAs simultâneos competem entre si, e o
		// gate de geometria comprovou que eles chegavam a se SOBREPOR na janela
		// de transição (ctaFixo x waFloat, e aviso x waFloat).
		//
		// `updateChrome &&` é o que impede o flutuante de sumir para sempre nas
		// páginas SEM pilha (/termos, /politica-de-privacidade, /404): lá não há
		// CTA concorrente, então não há motivo para recolher.
		const chromeOpen = updateChrome ? updateChrome(y) : false;
		floatWa?.classList.toggle("is-visible", y > 400 && !chromeOpen);

		for (const el of parallax) {
			const rect = el.getBoundingClientRect();
			if (rect.bottom < -200 || rect.top > viewport + 200) continue;
			const speed = Number(el.dataset.speed || "0.12");
			const offset = (rect.top + rect.height / 2 - viewport / 2) * -speed;
			el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
		}
	};

	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(frame);
	};

	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll, { passive: true });
	frame();
};

/* ---------- bootstrap ---------- */

const start = () => {
	for (const init of [
		initReveal,
		initEnter,
		initMarquee,
		initTilt,
		initScroll,
	]) {
		try {
			init();
		} catch {
			/* cada primitiva é enhancement — uma falha não derruba as outras */
		}
	}
};

try {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", start, { once: true });
	} else {
		start();
	}
} catch {
	/* último recurso: garante que nada fica preso em opacity 0 */
	for (const el of document.querySelectorAll("[data-reveal]")) {
		el.classList.add("revealed");
	}
	for (const el of document.querySelectorAll("[data-enter]")) {
		el.classList.add("entered");
	}
}
