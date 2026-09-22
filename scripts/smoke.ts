// Smoke do core (store + auth) contra a planilha/env reais. Roda com bun:
//   SHEETS_WEBAPP_URL=... SHEETS_SHARED_SECRET=... ADMIN_USERS=... \
//   ADMIN_SESSION_SECRET=... bun scripts/smoke.ts
// Cria um lead de teste, exercita upsert/list/contacted e limpa no fim.

import {
	createAdminSession,
	readAdminSessionToken,
	verifyAdminLogin,
} from "../src/lib/server/auth.ts";
import {
	captureLead,
	EXPECTED_STORE_VERSION,
	getLead,
	LeadStoreError,
	listLeads,
	pingLeadStore,
	purgeLeadsByEmail,
	setLeadContacted,
} from "../src/lib/server/leads-store.ts";

const TEST_EMAIL = "smoke-test@aula-otb.local";
let ok = true;
const check = (label: string, pass: boolean) => {
	console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
	if (!pass) ok = false;
};

// --- Store ---
// A versão é assert, não enfeite: sem ela, "colei o Code.gs novo mas esqueci de
// publicar Nova versão" passa silencioso e só aparece como campo vazio no
// painel, dias depois.
try {
	const ping = await pingLeadStore();
	check("pingLeadStore responde", ping.sheet === "leads");
	check(
		`Web App na v${EXPECTED_STORE_VERSION}`,
		ping.version === EXPECTED_STORE_VERSION,
	);
} catch (err) {
	check(`Web App na v${EXPECTED_STORE_VERSION}`, false);
	if (err instanceof LeadStoreError && err.code === "store_version_mismatch") {
		console.error(`      ${err.message}`);
		console.error(
			"      Implantar > Gerenciar implantações > lápis > Versão: Nova versão\n" +
				"      (implantação NOVA muda a URL e quebra o site — editar a existente)",
		);
	}
	console.log("\nSMOKE FALHOU");
	process.exit(1);
}

const first = await captureLead({
	contact: {
		name: "Smoke Tester",
		email: TEST_EMAIL,
		phone: "5562999990000",
		profession: "QA",
		consentGiven: true,
		consentTimestamp: new Date().toISOString(),
	},
	meta: {
		utm: {
			utm_source: "instagram",
			utm_medium: "bio",
			utm_campaign: "aula-otb-0909",
		},
		landingPath: "/",
	},
});
check("captureLead cria (created=true)", first.created === true);
check("status inicial = novo", first.lead.status === "novo");
// A origem vem GRAVADA da planilha (P/Q/R via toLead_), não recalculada aqui —
// é o que prova o hop planilha -> API sem abrir a planilha.
check("origem P fonte", first.lead.fonte === "instagram");
check("origem Q midia", first.lead.midia === "bio");
check("origem R campanha", first.lead.campanha === "aula-otb-0909");

const second = await captureLead({
	contact: {
		name: "Smoke Tester 2",
		email: TEST_EMAIL,
		phone: "5562999990001",
		consentGiven: true,
		consentTimestamp: new Date().toISOString(),
	},
	meta: { utm: {} },
});
check("captureLead upsert (created=false)", second.created === false);
check("upsert atualizou phone", second.lead.phone === "5562999990001");
// Comportamento vigente e documentado (docs/planilha-leads.md): a UTM mais
// recente vence, inclusive vazia. Está registrado como follow-up.
check("upsert sem UTM vira direto", second.lead.fonte === "direto");

const list = await listLeads(50);
check(
	"listLeads acha o lead",
	list.some((l) => l.email === TEST_EMAIL),
);

const contacted = await setLeadContacted(first.lead.id, true);
check("setLeadContacted -> contatado", contacted?.status === "contatado");
const fetched = await getLead(first.lead.id);
check("getLead reflete contatado", fetched?.status === "contatado");

// --- Auth (lógica; valores de teste) ---
const auth = await verifyAdminLogin("admin", "senha-correta");
check("verifyAdminLogin senha certa", auth?.role === "admin");
const authBad = await verifyAdminLogin("admin", "errada");
check("verifyAdminLogin senha errada = null", authBad === null);

if (auth) {
	const token = await createAdminSession(auth);
	const session = token ? await readAdminSessionToken(token) : null;
	check("sessão round-trip", session?.username === "admin");
	const tampered = token ? await readAdminSessionToken(`${token}x`) : null;
	check("assinatura adulterada = null", tampered === null);
}

// --- Cleanup ---
const deleted = await purgeLeadsByEmail(TEST_EMAIL);
check("cleanup removeu a linha de teste", deleted > 0);

console.log(ok ? "\nSMOKE OK" : "\nSMOKE FALHOU");
process.exit(ok ? 0 : 1);
