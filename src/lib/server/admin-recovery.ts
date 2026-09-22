import { z } from "astro/zod";
import { bytesToHex, hashAdminPassword, sha256Hex } from "./admin-password";
import { getServerEnv } from "./env";
import { callSheets, getLeadStoreConfigStatus } from "./leads-store";

export const RECOVERY_USERNAME = "COMERCIAL";
export const RECOVERY_EMAIL = "suporte@drasacha.com.br";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const stateSchema = z.object({
	version: z.literal(1),
	passwordHash: z
		.string()
		.regex(/^pbkdf2-sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}$/)
		.nullable(),
	revision: z.string().min(1).max(100),
});

export function isRecoveryEnabled(): boolean {
	return getServerEnv("ADMIN_PASSWORD_RECOVERY_ENABLED") === "true";
}

function recoveryOrigin(): string | null {
	try {
		const url = new URL(getServerEnv("ADMIN_APP_ORIGIN") ?? "");
		if (url.protocol !== "https:" || url.username || url.password) return null;
		if (url.pathname !== "/" || url.search || url.hash) return null;
		return url.origin;
	} catch {
		return null;
	}
}

export function isRecoveryConfigured(): boolean {
	return (
		isRecoveryEnabled() &&
		getLeadStoreConfigStatus().configured &&
		recoveryOrigin() !== null
	);
}

export async function getAdminCredentialState(username: string, login = false) {
	return stateSchema.parse(await callSheets("adminAuth", { username, login }));
}

export async function requestAdminRecovery(): Promise<boolean> {
	const origin = recoveryOrigin();
	if (!isRecoveryConfigured() || !origin) return false;
	const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
	const result = await callSheets("adminResetRequest", {
		tokenHash: await sha256Hex(token),
		resetUrl: `${origin}/admin/recuperar#token=${token}`,
	});
	return z.object({ sent: z.literal(true) }).safeParse(result).success;
}

export async function resetAdminPassword(
	token: string,
	password: string,
): Promise<boolean> {
	if (!isRecoveryConfigured() || !TOKEN_PATTERN.test(token)) return false;
	if (password.length < 12 || password.length > 128) return false;
	const tokenHash = await sha256Hex(token);
	const validation = await callSheets("adminReset", {
		tokenHash,
		validateOnly: true,
	});
	if (!z.object({ valid: z.literal(true) }).safeParse(validation).success) {
		return false;
	}
	const result = await callSheets("adminReset", {
		tokenHash,
		passwordHash: await hashAdminPassword(password),
	});
	return z.object({ reset: z.literal(true) }).safeParse(result).success;
}
