// Auth multiusuário (admin + vendas) com WebCrypto puro — sem dependência externa.
// Senha nunca em texto: SHA-256 hex em ADMIN_USERS. Sessão assinada HMAC-SHA256
// com ADMIN_SESSION_SECRET. Comparações timing-safe.
import type { AstroCookies } from "astro";
import { getMissingEnv, getServerEnv } from "./env";

export const SESSION_COOKIE = "aulaotb_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminUser {
	username: string;
	passwordSha256: string;
	role: string;
}

export interface AdminSession {
	username: string;
	role: string;
	exp: number;
}

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	return hex;
}

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

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
	return bytesToHex(new Uint8Array(digest));
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

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

function isAdminUser(u: unknown): u is AdminUser {
	return (
		!!u &&
		typeof (u as AdminUser).username === "string" &&
		typeof (u as AdminUser).passwordSha256 === "string" &&
		typeof (u as AdminUser).role === "string"
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
	return { configured: missing.length === 0, missing };
}

// Acha usuário por username + compara hash da senha — ambos timing-safe.
export async function verifyAdminLogin(
	username: string,
	password: string,
): Promise<{ username: string; role: string } | null> {
	const users = parseAdminUsers();
	if (users.length === 0) return null;

	const candidateHash = await sha256Hex(password);
	let matched: AdminUser | null = null;
	for (const user of users) {
		const userOk = timingSafeEqual(user.username, username);
		const passOk = timingSafeEqual(user.passwordSha256, candidateHash);
		if (userOk && passOk) matched = user;
	}
	return matched ? { username: matched.username, role: matched.role } : null;
}

export async function createAdminSession(user: {
	username: string;
	role: string;
}): Promise<string | null> {
	const secret = getServerEnv("ADMIN_SESSION_SECRET");
	if (!secret) return null;
	const payload: AdminSession = {
		username: user.username,
		role: user.role,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
	const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await hmacSha256(body, secret);
	return `${body}.${signature}`;
}

export async function readAdminSessionToken(
	token: string | undefined,
): Promise<AdminSession | null> {
	if (!token) return null;
	const secret = getServerEnv("ADMIN_SESSION_SECRET");
	if (!secret) return null;

	const dot = token.lastIndexOf(".");
	if (dot < 0) return null;
	const body = token.slice(0, dot);
	const signature = token.slice(dot + 1);

	const expected = await hmacSha256(body, secret);
	if (!timingSafeEqual(signature, expected)) return null;

	try {
		const json = new TextDecoder().decode(base64UrlToBytes(body));
		const parsed = JSON.parse(json) as AdminSession;
		if (typeof parsed.exp !== "number" || parsed.exp * 1000 < Date.now()) {
			return null;
		}
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
