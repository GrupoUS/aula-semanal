// Auth multiusuário (admin + vendas) com WebCrypto puro — sem dependência externa.
// PBKDF2 para novas senhas; SHA-256 legado aceito para configuração existente.
// A revisão vincula a sessão à credencial atual e revoga sessões após reset.
import type { AstroCookies } from "astro";
import {
	isPasswordHash,
	timingSafeEqual,
	verifyAdminPassword,
} from "./admin-password";
import { getAdminCredentialState, isRecoveryEnabled } from "./admin-recovery";
import { getMissingEnv, getServerEnv } from "./env";

export const SESSION_COOKIE = "aulaotb_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminUser {
	username: string;
	passwordSha256?: string;
	passwordHash?: string;
	role: string;
}

export interface AdminSession {
	username: string;
	role: string;
	exp: number;
	revision: string;
}

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
	const padded =
		value.length % 4 === 0 ? value : value + "=".repeat(4 - (value.length % 4));
	const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function hmacSha256(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(value),
	);
	return bytesToBase64Url(new Uint8Array(signature));
}

function isAdminUser(u: unknown): u is AdminUser {
	if (!u || typeof u !== "object") return false;
	const user = u as Partial<AdminUser>;
	return (
		typeof user.username === "string" &&
		/^[A-Za-z0-9._-]{1,64}$/.test(user.username) &&
		(isPasswordHash(user.passwordHash) ||
			(typeof user.passwordSha256 === "string" &&
				/^[a-f0-9]{64}$/.test(user.passwordSha256))) &&
		typeof user.role === "string" &&
		user.role.length > 0
	);
}

function parseAdminUsers(): AdminUser[] {
	const raw = (getServerEnv("ADMIN_USERS") ?? "").trim();
	if (!raw) return [];

	// Candidatos: o valor cru e, como fallback, sua decodificação base64.
	// (A Vercel CLI remove aspas duplas de valores JSON via --value, quebrando o
	// JSON.parse — armazenar a lista em base64 preserva o conteúdo intacto.)
	const candidates = [raw];
	try {
		const decoded = atob(raw);
		if (decoded && decoded !== raw) candidates.push(decoded);
	} catch {
		// raw não é base64 válido — ignora o fallback.
	}

	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate);
			if (Array.isArray(parsed)) {
				const users = parsed.filter(isAdminUser);
				if (users.length > 0) return users;
			}
		} catch {
			// tenta o próximo candidato
		}
	}
	return [];
}

export function getAdminAuthConfigStatus(): {
	configured: boolean;
	missing: string[];
} {
	const missing = getMissingEnv(["ADMIN_USERS", "ADMIN_SESSION_SECRET"]);
	if (!missing.includes("ADMIN_USERS") && parseAdminUsers().length === 0) {
		missing.push("ADMIN_USERS");
	}
	if (
		!missing.includes("ADMIN_SESSION_SECRET") &&
		(getServerEnv("ADMIN_SESSION_SECRET")?.length ?? 0) < 32
	) {
		missing.push("ADMIN_SESSION_SECRET");
	}
	return { configured: missing.length === 0, missing };
}

export function hasAdminUser(username: string): boolean {
	return parseAdminUsers().some((user) => user.username === username);
}

async function currentCredential(user: AdminUser, login = false) {
	const remote = isRecoveryEnabled()
		? await getAdminCredentialState(user.username, login)
		: null;
	const hash =
		remote?.passwordHash ?? user.passwordHash ?? user.passwordSha256 ?? "";
	const revision = await hmacSha256(
		JSON.stringify([
			user.username,
			user.role,
			hash,
			remote?.revision ?? "local",
		]),
		getServerEnv("ADMIN_SESSION_SECRET") ?? "",
	);
	return { hash, revision };
}

// Teto local protege o bootstrap; com recuperação ativa o Apps Script também
// limita de forma persistente. O contador local reinicia a cada cold start.
let loginWindow = { startedAt: 0, count: 0 };

export async function verifyAdminLogin(
	username: string,
	password: string,
): Promise<{ username: string; role: string; revision: string } | null> {
	if (!getAdminAuthConfigStatus().configured) return null;
	if (Date.now() - loginWindow.startedAt >= 60000) {
		loginWindow = { startedAt: Date.now(), count: 0 };
	}
	if (++loginWindow.count > 20) throw new Error("login_rate_limited");
	const users = parseAdminUsers();
	const user = users.find((candidate) =>
		timingSafeEqual(candidate.username, username),
	);
	if (!user) {
		if (isRecoveryEnabled()) await getAdminCredentialState("_unknown", true);
		return null;
	}
	const credential = await currentCredential(user, true);
	if (!(await verifyAdminPassword(password, credential.hash))) return null;
	return {
		username: user.username,
		role: user.role,
		revision: credential.revision,
	};
}

export async function createAdminSession(user: {
	username: string;
	role: string;
	revision: string;
}): Promise<string | null> {
	const secret = getServerEnv("ADMIN_SESSION_SECRET");
	if (!secret || secret.length < 32) return null;
	const payload: AdminSession = {
		username: user.username,
		role: user.role,
		revision: user.revision,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
	const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await hmacSha256(body, secret);
	return `${body}.${signature}`;
}

export async function readAdminSessionToken(
	token: string | undefined,
): Promise<AdminSession | null> {
	if (!token || token.length > 2048) return null;
	const secret = getServerEnv("ADMIN_SESSION_SECRET");
	if (!secret || secret.length < 32) return null;

	const dot = token.lastIndexOf(".");
	if (dot < 0) return null;
	const body = token.slice(0, dot);
	const signature = token.slice(dot + 1);

	const expected = await hmacSha256(body, secret);
	if (!timingSafeEqual(signature, expected)) return null;

	try {
		const json = new TextDecoder().decode(base64UrlToBytes(body));
		const parsed = JSON.parse(json) as AdminSession;
		if (
			!Number.isFinite(parsed.exp) ||
			parsed.exp * 1000 <= Date.now() ||
			typeof parsed.username !== "string" ||
			typeof parsed.role !== "string" ||
			typeof parsed.revision !== "string"
		) {
			return null;
		}
		const user = parseAdminUsers().find(
			(entry) =>
				entry.username === parsed.username && entry.role === parsed.role,
		);
		if (!user) return null;
		const credential = await currentCredential(user);
		if (!timingSafeEqual(parsed.revision, credential.revision)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export async function readAdminSession(
	cookies: AstroCookies,
): Promise<AdminSession | null> {
	return readAdminSessionToken(cookies.get(SESSION_COOKIE)?.value);
}

export function setAdminSessionCookie(
	cookies: AstroCookies,
	token: string,
): void {
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_TTL_SECONDS,
	});
}

export function clearAdminSessionCookie(cookies: AstroCookies): void {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}
