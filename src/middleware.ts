import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
	const admin =
		url.pathname === "/admin" ||
		url.pathname.startsWith("/admin/") ||
		url.pathname.startsWith("/api/admin/");
	if (!admin) return next();
	let response: Response;
	if (
		request.method === "POST" &&
		request.headers.get("origin") !== url.origin
	) {
		response = new Response("Origem da solicitação inválida.", { status: 403 });
	} else {
		response = await next();
	}
	response.headers.set("Cache-Control", "private, no-store");
	// no-referrer transforma Origin em null nos POSTs nativos do próprio painel.
	response.headers.set("Referrer-Policy", "same-origin");
	response.headers.set("X-Robots-Tag", "noindex, nofollow");
	return response;
});
