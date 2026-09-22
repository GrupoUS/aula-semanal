import type { APIRoute } from "astro";
import {
	createAdminSession,
	setAdminSessionCookie,
	verifyAdminLogin,
} from "../../../lib/server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const username = String(form.get("username") ?? "");
	const password = String(form.get("password") ?? "");

	const user = await verifyAdminLogin(username, password);
	if (!user) return redirect("/admin?error=invalid", 303);

	const token = await createAdminSession(user);
	if (!token) return redirect("/admin?error=config", 303);

	setAdminSessionCookie(cookies, token);
	return redirect("/admin/leads", 303);
};
