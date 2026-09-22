import type { APIRoute } from "astro";
import { leadSource } from "../../../lib/leads/attribution";
import { readAdminSession } from "../../../lib/server/auth";
import { queryLeads } from "../../../lib/server/leads-store";

export const prerender = false;

const COLUMNS = [
	"id",
	"status",
	"createdAt",
	"updatedAt",
	"contactedAt",
	"name",
	"email",
	"phone",
	"profession",
	"consent",
	"consentAt",
	// Origem legível — mesmas colunas P/Q/R da planilha.
	"fonte",
	"midia",
	"campanha",
	"utm",
	"referrer",
	"landingPath",
] as const;

function escapeCsv(value: unknown): string {
	const text =
		value == null
			? ""
			: typeof value === "object"
				? JSON.stringify(value)
				: String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async ({ cookies, url }) => {
	const session = await readAdminSession(cookies);
	if (!session) return new Response("Unauthorized", { status: 401 });

	// CSV respeita os mesmos filtros da view (exporta tudo que casa, sem paginar).
	const sp = url.searchParams;
	const statusParam = sp.get("status") ?? "";
	const status =
		statusParam === "novo" || statusParam === "contatado"
			? statusParam
			: undefined;
	const profession = (sp.get("profession") ?? "").trim() || undefined;
	const name = (sp.get("q") ?? "").trim() || undefined;
	const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
	const fromRaw = (sp.get("from") ?? "").trim();
	const dateFrom = isDate(fromRaw) ? fromRaw : undefined;
	const toRaw = (sp.get("to") ?? "").trim();
	const dateTo = isDate(toRaw) ? toRaw : undefined;

	const { leads } = await queryLeads({
		status,
		profession,
		name,
		dateFrom,
		dateTo,
		limit: 1000,
		offset: 0,
	});
	const header = COLUMNS.join(",");
	const rows = leads.map((lead) => {
		const row: Record<string, unknown> = {
			...lead,
			// Valor GRAVADO na planilha; `url.hostname` sai daqui de vez (no
			// preview da Vercel ele produzia origem diferente da planilha).
			...leadSource(lead),
		};
		return COLUMNS.map((col) => escapeCsv(row[col])).join(",");
	});
	const csv = [header, ...rows].join("\r\n");

	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": 'attachment; filename="leads-aula-semanal.csv"',
		},
	});
};
