import type { APIRoute } from "astro";
import { readAdminForm } from "../../../lib/server/admin-form";
import {
	createAdminSession,
	setAdminSessionCookie,
	verifyAdminLogin,
} from "../../../lib/server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await readAdminForm(request);
	if (!form) return redirect("/admin?error=invalid", 303);
	const username = (form.get("username") ?? "").trim();
	const password = form.get("password") ?? "";
	if (!username || username.length > 64 || !password || password.length > 128) {
		return redirect("/admin?error=invalid", 303);
	}

	try {
		const user = await verifyAdminLogin(username, password);
		if (!user) return redirect("/admin?error=invalid", 303);

		const token = await createAdminSession(user);
		if (!token) return redirect("/admin?error=config", 303);

		setAdminSessionCookie(cookies, token);
		return redirect("/admin/leads", 303);
	} catch {
		return redirect("/admin?error=unavailable", 303);
	}
};
