/**
 * Aula OTB — store de leads em Google Sheets (Apps Script Web App).
 *
 * Runbook completo: docs/planilha-leads.md
 *
 * Deploy: Implantar > Nova implantação > Aplicativo da Web
 *   Executar como: Eu   ·   Quem tem acesso: Qualquer pessoa
 *
 * Contrato: POST JSON { secret, action, payload } -> { ok, action, data } | { ok:false, error }
 *
 * ATENÇÃO — duas armadilhas da plataforma que o cliente TS compensa:
 *  1. Apps Script SEMPRE responde HTTP 200. O cliente confere `body.ok`,
 *     nunca `res.ok` isoladamente.
 *  2. doPost(e) NÃO enxerga headers de request. Por isso o segredo viaja no
 *     corpo, e não em header de autorização.
 */

const SHEET_NAME = "leads";
const TZ = "America/Sao_Paulo";
// Sobe sempre que o Code.gs muda algo que o cliente TypeScript consome. É o
// único jeito de detectar "colei o script novo mas esqueci de publicar Nova
// versão" — sem isso o sintoma é silencioso: campo vazio no painel.
// v3: toLead_ devolve fonte/midia/campanha, guarda de conflito por coluna,
//     migrarDryRun.
const API_VERSION = 3;
const SECRET_PROP = "SHARED_SECRET";
const LOCK_MS = 20000;

/** Host da landing — referrer dele mesmo não conta como origem externa. */
const SELF_HOST = "aulaotb.gpus.com.br";

const HEADERS = [
  "id",
  "criado_em",
  "atualizado_em",
  "nome",
  "email",
  "telefone",
  "profissao",
  "status",
  "contatado_em",
  "consentimento",
  "consentimento_em",
  "utm",
  "referrer",
  "user_agent",
  "landing_path",
  // P/Q/R — derivadas da coluna `utm`, para o time filtrar tráfego sem ler JSON.
  "fonte",
  "midia",
  "campanha",
];

// Índices posicionais. O script endereça por índice, então renomear um
// cabeçalho é inofensivo — REORDENAR uma coluna corrompe tudo.
const C = {
  id: 0,
  createdAt: 1,
  updatedAt: 2,
  name: 3,
  email: 4,
  phone: 5,
  profession: 6,
  status: 7,
  contactedAt: 8,
  consent: 9,
  consentAt: 10,
  utm: 11,
  referrer: 12,
  userAgent: 13,
  landingPath: 14,
  fonte: 15,
  midia: 16,
  campanha: 17,
};

/* ------------------------------ setup manual ------------------------------ */

/** Rodar UMA vez no editor: cria a aba `leads` e gera o segredo compartilhado. */
function configurar() {
  const secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty(SECRET_PROP, secret);
  sheet_();
  Logger.log("SHEETS_SHARED_SECRET = " + secret);
}

/**
 * Rodar UMA vez no editor depois de publicar a v2: cria os cabeçalhos
 * `fonte` / `midia` / `campanha` (P/Q/R) e preenche as linhas antigas a partir
 * do JSON da coluna `utm`. Idempotente — rodar de novo só reescreve o mesmo
 * valor. Nada fora de P/Q/R é tocado.
 *
 * ABORTA sem escrever nada se P/Q/R já tiverem conteúdo do time: a v1 nunca
 * escreveu além da coluna O, então qualquer coisa ali é anotação humana, e a
 * v2 passaria por cima. Nesse caso o log diz exatamente qual célula travou.
 */
/**
 * AUDITORIA — mostra exatamente o que `migrar()` FARIA, sem escrever nada:
 * nenhum cabeçalho, nenhuma coluna inserida, nenhuma célula gravada.
 * É a evidência do go/no-go antes da migração de verdade.
 *
 * O log traz só contagem e origem derivada — nunca nome, e-mail ou telefone.
 */
function migrarDryRun() {
  migrarInterno_(true);
}

/**
 * Rodar UMA vez no editor depois de publicar: cria os cabeçalhos
 * `fonte` / `midia` / `campanha` (P/Q/R) e preenche as linhas antigas a partir
 * do JSON da coluna `utm`. Idempotente — rodar de novo só reescreve o mesmo
 * valor. Nada fora de P/Q/R é tocado. Rode `migrarDryRun` antes.
 *
 * ABORTA sem escrever nada se P/Q/R tiverem conteúdo do time: a v1 nunca
 * escreveu além da coluna O, então qualquer coisa ali é anotação humana, e a
 * v2 passaria por cima. Nesse caso o log diz exatamente qual célula travou.
 */
function migrar() {
  migrarInterno_(false);
}

/** Teto de linhas no resumo por origem — log longo ninguém lê. */
const DRY_RUN_MAX_ORIGENS = 20;

function migrarInterno_(simulacao) {
  const tag = simulacao ? "[DRY-RUN] " : "";

  // Auditoria ANTES de sheet_(), que já criaria os cabeçalhos que faltam.
  const existente = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const conflito = existente ? conflitoDerivadas_(existente) : "";
  if (conflito) {
    Logger.log(tag + "migrar ABORTADO — " + conflito);
    Logger.log(
      "Mova esse conteúdo para a coluna S (ou adiante) e rode migrar de novo. " +
        "Nada foi escrito.",
    );
    return;
  }

  if (simulacao) {
    if (!existente) {
      Logger.log(
        tag + "aba `" + SHEET_NAME + "` não existe — migrar criaria a aba e os " +
          HEADERS.length + " cabeçalhos.",
      );
      return;
    }
    const faltam = HEADERS.length - existente.getMaxColumns();
    if (faltam > 0) {
      Logger.log(tag + "migrar criaria " + faltam + " coluna(s) e o(s) cabeçalho(s) P/Q/R.");
    }
    const dados = linhasBrutas_(existente);
    if (!dados.length) {
      Logger.log(tag + "nenhuma linha de lead — só os cabeçalhos seriam criados.");
      return;
    }
    let mudariam = 0;
    const resumo = {};
    for (let i = 0; i < dados.length; i++) {
      const lead = toLead_(dados[i]);
      const src = source_(lead.utm, lead.referrer);
      const novoValor = [src.fonte, src.midia, src.campanha].join("|");
      const atual = [
        txt_(dados[i][C.fonte]),
        txt_(dados[i][C.midia]),
        txt_(dados[i][C.campanha]),
      ].join("|");
      if (atual !== novoValor) mudariam++;
      resumo[novoValor] = (resumo[novoValor] || 0) + 1;
    }
    Logger.log(
      tag + dados.length + " linha(s) seriam reescritas em P/Q/R; " +
        mudariam + " com valor diferente do atual.",
    );
    const chaves = Object.keys(resumo).sort();
    for (let k = 0; k < Math.min(chaves.length, DRY_RUN_MAX_ORIGENS); k++) {
      const rotulo =
        chaves[k] === "||" ? "(vazio)" : chaves[k].split("|").filter(String).join(" / ");
      Logger.log(tag + "  " + rotulo + " -> " + resumo[chaves[k]] + " linha(s)");
    }
    if (chaves.length > DRY_RUN_MAX_ORIGENS) {
      Logger.log(tag + "  … e mais " + (chaves.length - DRY_RUN_MAX_ORIGENS) + " origem(ns).");
    }
    Logger.log(tag + "NADA FOI ESCRITO. Rode `migrar` para aplicar.");
    return;
  }

  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) {
    Logger.log("migrar: nenhuma linha de lead — só os cabeçalhos foram criados.");
    return;
  }
  const data = rows_(sh);
  const derived = [];
  for (let i = 0; i < data.length; i++) {
    const lead = toLead_(data[i]);
    const src = source_(lead.utm, lead.referrer);
    derived.push([src.fonte, src.midia, src.campanha]);
  }
  sh.getRange(2, C.fonte + 1, derived.length, 3)
    .setNumberFormat("@")
    .setValues(derived);
  Logger.log("migrar: " + derived.length + " linha(s) com fonte/midia/campanha.");
}

/**
 * Linhas 2..last recortadas à largura REAL da aba e completadas até
 * HEADERS.length. `rows_()` não serve na simulação: numa aba v1 de 15 colunas
 * ele pediria um range além do fim e estouraria — e alargar a aba já seria
 * mutação, que é justamente o que o dry-run promete não fazer.
 */
function linhasBrutas_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const width = Math.min(HEADERS.length, sh.getMaxColumns());
  const raw = sh.getRange(2, 1, last - 1, width).getValues();
  if (width === HEADERS.length) return raw;
  for (let i = 0; i < raw.length; i++) {
    while (raw[i].length < HEADERS.length) raw[i].push("");
  }
  return raw;
}

/**
 * "" = P/Q/R livres (ou já migradas). Qualquer outra string descreve o que
 * impede a migração, no formato pronto para o log.
 */
function conflitoDerivadas_(sh) {
  const first = C.fonte + 1; // 1-based
  const maxCols = sh.getMaxColumns();
  if (maxCols < first) return ""; // aba mais estreita que O: nada para conflitar
  const width = Math.min(HEADERS.length - C.fonte, maxCols - first + 1);

  const head = sh.getRange(1, first, 1, width).getValues()[0];
  const alheios = [];
  const semCabecalho = []; // offsets 0-based dentro da janela P..R
  for (let i = 0; i < width; i++) {
    const label = txt_(head[i]);
    if (label === "") {
      semCabecalho.push(i);
      continue;
    }
    if (label !== HEADERS[C.fonte + i]) {
      alheios.push(colLetra_(first + i) + '1 = "' + label + '"');
    }
  }
  if (alheios.length) return "cabeçalho ocupado: " + alheios.join(", ");
  // "Já migrada" é propriedade de CADA coluna, não da janela. Com P1 = `fonte`
  // e Q1 em branco, a v1 nunca poderia ter escrito em Q — então dado em Q7 é
  // anotação humana e trava a migração, mesmo com P já sendo nossa. Antes um
  // `nossos > 0` curto-circuitava a varredura e o setValues passava por cima.
  if (semCabecalho.length === 0) return "";

  const last = sh.getLastRow();
  if (last < 2) return "";
  const body = sh.getRange(2, first, last - 1, width).getValues();
  for (let r = 0; r < body.length; r++) {
    for (let k = 0; k < semCabecalho.length; k++) {
      const c = semCabecalho[k];
      if (txt_(body[r][c]) !== "") {
        return (
          "conteúdo sem cabeçalho em " +
          colLetra_(first + c) +
          (r + 2) +
          " (a v1 nunca escreveu aí — parece anotação do time)"
        );
      }
    }
  }
  return "";
}

/** Índice 1-based para letra de coluna A1 (16 -> "P"). */
function colLetra_(n) {
  let out = "";
  let x = n;
  while (x > 0) {
    out = String.fromCharCode(65 + ((x - 1) % 26)) + out;
    x = Math.floor((x - 1) / 26);
  }
  return out;
}

/* ------------------------------- transporte ------------------------------- */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return out_({ ok: false, error: "invalid_payload" });
    }
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return out_({ ok: false, error: "invalid_json" });
    }
    return out_(handle_(body));
  } catch (err) {
    return out_({ ok: false, error: errCode_(err), message: msg_(err) });
  }
}

/** GET é só health probe — nenhum dado pessoal é alcançável por aqui. */
function doGet(e) {
  const secret = e && e.parameter ? e.parameter.secret : "";
  if (!secretOk_(secret)) return out_({ ok: false, error: "unauthorized" });
  return out_({ ok: true, action: "ping", data: ping_() });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function handle_(body) {
  if (!body || !secretOk_(body.secret)) return { ok: false, error: "unauthorized" };
  const action = String(body.action || "");
  const p = body.payload || {};
  switch (action) {
    case "ping":
      return { ok: true, action: action, data: ping_() };
    case "capture":
      return { ok: true, action: action, data: capture_(p) };
    case "dashboard":
      return { ok: true, action: action, data: dashboard_(p) };
    case "getLead": {
      const hit = findById_(p.id);
      return hit
        ? { ok: true, action: action, data: { lead: hit.lead } }
        : { ok: false, error: "not_found" };
    }
    case "setContacted": {
      const lead = setContacted_(p);
      return lead
        ? { ok: true, action: action, data: { lead: lead } }
        : { ok: false, error: "not_found" };
    }
    case "purgeByEmail":
      return { ok: true, action: action, data: { deleted: purgeByEmail_(p) } };
    default:
      return { ok: false, error: "bad_action" };
  }
}

/** Comparação de tempo constante (espelha timingSafeEqual de src/lib/server/auth.ts). */
function secretOk_(candidate) {
  const expected =
    PropertiesService.getScriptProperties().getProperty(SECRET_PROP) || "";
  const got = candidate == null ? "" : String(candidate);
  if (!expected || expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

function msg_(err) {
  return String(err && err.message ? err.message : err);
}

function errCode_(err) {
  return msg_(err).indexOf("locked") >= 0 ? "locked" : "internal";
}

/* -------------------------------- planilha -------------------------------- */

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    // Texto puro: preserva ISO 8601, telefone com "+55"/zero à esquerda e o JSON de UTM.
    sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).setNumberFormat("@");
  }
  // A aba precisa comportar as colunas do contrato (v1 tinha 15, v2 tem 18).
  const short = HEADERS.length - sh.getMaxColumns();
  if (short > 0) sh.insertColumnsAfter(sh.getMaxColumns(), short);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    return sh;
  }
  ensureTailHeaders_(sh);
  return sh;
}

/**
 * Planilha criada na v1 tem 15 cabeçalhos. Escreve só os que faltam no fim
 * (`fonte`/`midia`/`campanha`) — renomeações do time em A–O ficam intactas, e
 * um cabeçalho já preenchido não é sobrescrito.
 */
function ensureTailHeaders_(sh) {
  const first = C.fonte; // 0-based
  const width = HEADERS.length - first;
  const current = sh.getRange(1, first + 1, 1, width).getValues()[0];
  for (let i = 0; i < width; i++) {
    if (txt_(current[i]) !== "") continue;
    sh.getRange(1, first + 1 + i)
      .setNumberFormat("@")
      .setValue(HEADERS[first + i])
      .setFontWeight("bold");
  }
}

function rows_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

/** Escreve exatamente 18 colunas (A–R) — anotações do time (S+) ficam intactas. */
function writeRow_(sh, rowNumber, lead) {
  if (rowNumber > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  sh.getRange(rowNumber, 1, 1, HEADERS.length)
    .setNumberFormat("@")
    .setValues([toRow_(lead)]);
}

function toRow_(l) {
  const src = source_(l.utm, l.referrer);
  return [
    l.id,
    l.createdAt,
    l.updatedAt,
    l.name,
    l.email,
    l.phone,
    l.profession || "",
    l.status,
    l.contactedAt || "",
    l.consent ? "TRUE" : "FALSE",
    l.consentAt || "",
    JSON.stringify(l.utm || {}),
    l.referrer || "",
    l.userAgent || "",
    l.landingPath || "",
    src.fonte,
    src.midia,
    src.campanha,
  ];
}

/* -------------------------------- origem ---------------------------------- */

/**
 * ESPELHO de `deriveSource()` em src/lib/leads/attribution.ts. Mudou lá, muda
 * aqui — senão a coluna P e a coluna "Origem" do painel divergem.
 *
 *  1. `utm_source` vence sempre;
 *  2. `gclid`/`fbclid` sem UTM (auto-tagging) = google/facebook + cpc;
 *  3. sem UTM, referrer externo vira host + `referral`;
 *  4. resto = `direto`.
 */
function source_(utm, referrer) {
  const u = utm || {};
  const get = function (k) {
    return txt_(u[k]);
  };
  const campanha = get("utm_campaign");
  const fonte = get("utm_source");
  if (fonte) return { fonte: fonte, midia: get("utm_medium"), campanha: campanha };
  if (get("gclid")) return { fonte: "google", midia: "cpc", campanha: campanha };
  if (get("fbclid")) return { fonte: "facebook", midia: "cpc", campanha: campanha };

  const host = host_(referrer);
  if (host && host !== SELF_HOST.replace(/^www\./, "")) {
    return { fonte: host, midia: "referral", campanha: campanha };
  }
  return { fonte: "direto", midia: "", campanha: campanha };
}

/** Host do referrer sem `www.`. Apps Script não tem URL(), então é regex. */
function host_(referrer) {
  const raw = txt_(referrer);
  if (!raw) return "";
  const m = raw.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  if (!m) return "";
  return m[1].replace(/^.*@/, "").replace(/:\d+$/, "").replace(/^www\./i, "").toLowerCase();
}

function toLead_(r) {
  const utm = {};
  const rawUtm = txt_(r[C.utm]);
  if (rawUtm) {
    try {
      const parsed = JSON.parse(rawUtm);
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach(function (k) {
          utm[k] = String(parsed[k]);
        });
      }
    } catch (err) {
      /* célula editada à mão — ignora e devolve {} */
    }
  }
  const epoch = new Date(0).toISOString();
  // P/Q/R são derivadas e machine-owned: o valor GRAVADO é o que painel, CSV e
  // CRM passam a exibir — chega de recalcular a mesma regra do lado TypeScript
  // com um `selfHost` diferente por hop. Linha anterior à `migrar()` tem as
  // três vazias; aí a regra roda na hora, para a API nunca devolver origem em
  // branco durante a janela da migração.
  const gravado = {
    fonte: txt_(r[C.fonte]),
    midia: txt_(r[C.midia]),
    campanha: txt_(r[C.campanha]),
  };
  const origem = gravado.fonte ? gravado : source_(utm, txt_(r[C.referrer]));
  return {
    id: txt_(r[C.id]),
    name: txt_(r[C.name]),
    email: txt_(r[C.email]),
    phone: txt_(r[C.phone]),
    profession: txt_(r[C.profession]) || null,
    consent: String(r[C.consent]).toUpperCase() === "TRUE",
    consentAt: iso_(r[C.consentAt]) || null,
    utm: utm,
    referrer: txt_(r[C.referrer]) || null,
    userAgent: txt_(r[C.userAgent]) || null,
    landingPath: txt_(r[C.landingPath]) || null,
    status: txt_(r[C.status]) === "contatado" ? "contatado" : "novo",
    createdAt: iso_(r[C.createdAt]) || epoch,
    updatedAt: iso_(r[C.updatedAt]) || epoch,
    contactedAt: iso_(r[C.contactedAt]) || null,
    fonte: origem.fonte,
    midia: origem.midia,
    campanha: origem.campanha,
  };
}

function txt_(v) {
  return v == null ? "" : String(v).trim();
}

function iso_(v) {
  if (v instanceof Date) return v.toISOString();
  const s = txt_(v);
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
}

function newId_() {
  return "lead_" + Date.now() + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
}

function day_(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : Utilities.formatDate(d, TZ, "yyyy-MM-dd");
}

/* --------------------------------- ações ---------------------------------- */

/**
 * Upsert por e-mail. Devolve `created` para o endpoint decidir se notifica o
 * dono do lead. Ser idempotente é o que torna o retry do cliente seguro depois
 * de um timeout (a requisição que estourou pode já ter gravado).
 */
function capture_(p) {
  const contact = p.contact || {};
  const meta = p.meta || {};
  const email = txt_(contact.email).toLowerCase();
  if (!email) throw new Error("invalid_payload");

  const utm = {};
  const rawUtm = meta.utm || {};
  Object.keys(rawUtm).forEach(function (k) {
    utm[k] = String(rawUtm[k]);
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) throw new Error("locked");
  try {
    const sh = sheet_();
    const data = rows_(sh);
    let idx = -1;
    for (let i = 0; i < data.length; i++) {
      if (txt_(data[i][C.email]).toLowerCase() === email) {
        idx = i;
        break;
      }
    }

    const now = new Date().toISOString();
    const base = {
      name: txt_(contact.name),
      email: txt_(contact.email),
      phone: txt_(contact.phone),
      profession: txt_(contact.profession) || null,
      consent: contact.consentGiven === true,
      consentAt: txt_(contact.consentTimestamp) || null,
      utm: utm,
      referrer: txt_(meta.referrer) || null,
      userAgent: txt_(meta.userAgent) || null,
      landingPath: txt_(meta.landingPath) || null,
      updatedAt: now,
    };

    // A origem devolvida tem que ser a que `toRow_` acabou de GRAVAR, não a que
    // veio da linha antiga: numa reinscrição, `toLead_(data[idx])` traz a
    // campanha anterior e o CRM receberia a errada.
    if (idx >= 0) {
      // Preserva id / criado_em / status / contatado_em da linha existente.
      const merged = Object.assign({}, toLead_(data[idx]), base);
      writeRow_(sh, idx + 2, merged);
      return {
        lead: Object.assign(merged, source_(merged.utm, merged.referrer)),
        created: false,
      };
    }

    const fresh = Object.assign({}, base, {
      id: newId_(),
      status: "novo",
      createdAt: now,
      contactedAt: null,
    });
    writeRow_(sh, sh.getLastRow() + 1, fresh);
    return {
      lead: Object.assign(fresh, source_(fresh.utm, fresh.referrer)),
      created: true,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Uma leitura da planilha resolve leads + total + stats + professions.
 * `include` permite pedir só o necessário (payload menor na rede).
 * stats e professions são GLOBAIS (ignoram filtros), igual ao comportamento
 * anterior de getLeadStats()/listProfessions() no Postgres.
 */
function dashboard_(p) {
  const include =
    p.include && p.include.length
      ? p.include
      : ["leads", "total", "stats", "professions"];
  const want = function (k) {
    return include.indexOf(k) >= 0;
  };

  const data = rows_(sheet_());
  const all = [];
  for (let i = 0; i < data.length; i++) {
    if (!txt_(data[i][C.id])) continue; // linha em branco / rascunho manual
    all.push(toLead_(data[i]));
  }

  const res = {};

  if (want("stats")) {
    let novos = 0;
    let contatados = 0;
    for (let s = 0; s < all.length; s++) {
      if (all[s].status === "contatado") contatados++;
      else novos++;
    }
    res.stats = { total: novos + contatados, novos: novos, contatados: contatados };
  }

  if (want("professions")) {
    const seen = {};
    for (let q = 0; q < all.length; q++) {
      if (all[q].profession) seen[all[q].profession] = true;
    }
    res.professions = Object.keys(seen).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    });
  }

  if (!want("leads") && !want("total")) return res;

  const fStatus = txt_(p.status);
  const fProf = txt_(p.profession);
  const fName = txt_(p.name).toLowerCase();
  const fFrom = txt_(p.dateFrom);
  const fTo = txt_(p.dateTo);

  const filtered = all.filter(function (l) {
    if (fStatus && l.status !== fStatus) return false;
    if (fProf && (l.profession || "") !== fProf) return false;
    if (fName && l.name.toLowerCase().indexOf(fName) < 0) return false;
    if (fFrom || fTo) {
      const d = day_(l.createdAt); // dia em America/Sao_Paulo
      if (fFrom && d < fFrom) return false;
      if (fTo && d > fTo) return false;
    }
    return true;
  });

  filtered.sort(function (a, b) {
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });

  if (want("total")) res.total = filtered.length;
  if (want("leads")) {
    const limit = Math.min(Math.max(Number(p.limit) || 200, 1), 1000);
    const offset = Math.max(Number(p.offset) || 0, 0);
    res.leads = filtered.slice(offset, offset + limit);
  }
  return res;
}

function findById_(id) {
  const target = txt_(id);
  if (!target) return null;
  const sh = sheet_();
  const data = rows_(sh);
  for (let i = 0; i < data.length; i++) {
    if (txt_(data[i][C.id]) === target) {
      return { sh: sh, row: i + 2, lead: toLead_(data[i]) };
    }
  }
  return null;
}

/** Sheets não tem UPDATE-by-key: lê a coluna de id, acha o índice, reescreve a linha. */
function setContacted_(p) {
  const contacted = p.contacted === true;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) throw new Error("locked");
  try {
    const hit = findById_(p.id);
    if (!hit) return null;
    const now = new Date().toISOString();
    hit.lead.status = contacted ? "contatado" : "novo";
    hit.lead.contactedAt = contacted ? now : null;
    hit.lead.updatedAt = now;
    writeRow_(hit.sh, hit.row, hit.lead);
    return hit.lead;
  } finally {
    lock.releaseLock();
  }
}

/** Só para o smoke test — remove linhas por e-mail. */
function purgeByEmail_(p) {
  const email = txt_(p.email).toLowerCase();
  if (!email) return 0;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) throw new Error("locked");
  try {
    const sh = sheet_();
    const data = rows_(sh);
    let deleted = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (txt_(data[i][C.email]).toLowerCase() === email) {
        sh.deleteRow(i + 2);
        deleted++;
      }
    }
    return deleted;
  } finally {
    lock.releaseLock();
  }
}

function ping_() {
  const sh = sheet_();
  return {
    version: API_VERSION,
    sheet: SHEET_NAME,
    rows: Math.max(0, sh.getLastRow() - 1),
    tz: TZ,
    now: new Date().toISOString(),
  };
}
