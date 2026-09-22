import type { APIRoute } from "astro";
import { readAdminSession } from "../../../lib/server/auth";
import { setLeadContacted } from "../../../lib/server/leads-store";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const session = await readAdminSession(cookies);
	if (!session) return redirect("/admin", 303);

	const form = await request.formData();
	const id = String(form.get("id") ?? "");
	const contacted = String(form.get("contacted") ?? "") === "true";
	// `return` carrega a querystring atual (filtros + página) p/ voltar à mesma view.
	const ret = String(form.get("return") ?? "");
	const safeReturn = /^\?[^\s]*$/.test(ret) ? ret : "";

	try {
		if (id) await setLeadContacted(id, contacted);
	} catch {
		// Falha de store é silenciosa — volta ao dashboard sem quebrar a UX.
	}

	return redirect(`/admin/leads${safeReturn}`, 303);
};
