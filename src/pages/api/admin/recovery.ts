import type { APIRoute } from "astro";
import { readAdminForm } from "../../../lib/server/admin-form";
import {
	isRecoveryConfigured,
	RECOVERY_USERNAME,
	requestAdminRecovery,
	resetAdminPassword,
} from "../../../lib/server/admin-recovery";
import {
	clearAdminSessionCookie,
	hasAdminUser,
} from "../../../lib/server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await readAdminForm(request);
	if (!form || !isRecoveryConfigured() || !hasAdminUser(RECOVERY_USERNAME)) {
		return redirect("/admin/recuperar?status=unavailable", 303);
	}
	try {
		if (form.get("action") === "request") {
			const sent = await requestAdminRecovery();
			return redirect(
				`/admin/recuperar?status=${sent ? "sent" : "unavailable"}`,
				303,
			);
		}
		if (form.get("action") !== "reset")
			return redirect("/admin/recuperar?status=invalid", 303);
		const password = form.get("password") ?? "";
		if (password !== form.get("confirmation"))
			return redirect("/admin/recuperar?status=invalid", 303);
		const reset = await resetAdminPassword(form.get("token") ?? "", password);
		if (!reset) return redirect("/admin/recuperar?status=invalid", 303);
		clearAdminSessionCookie(cookies);
		return redirect("/admin?status=reset", 303);
	} catch {
		return redirect("/admin/recuperar?status=unavailable", 303);
	}
};
