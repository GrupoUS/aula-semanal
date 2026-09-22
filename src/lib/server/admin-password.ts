const encoder = new TextEncoder();
const PASSWORD_HASH = /^pbkdf2-sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}$/;

export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function isPasswordHash(value: unknown): value is string {
	return typeof value === "string" && PASSWORD_HASH.test(value);
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
	return bytesToHex(new Uint8Array(digest));
}

export async function hashAdminPassword(
	password: string,
	salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
): Promise<string> {
	if (!/^[a-f0-9]{32}$/.test(salt)) throw new Error("invalid_salt");
	const saltBytes = Uint8Array.from(
		Array.from({ length: 16 }, (_, index) =>
			Number.parseInt(salt.slice(index * 2, index * 2 + 2), 16),
		),
	);
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 600000 },
		key,
		256,
	);
	return `pbkdf2-sha256$600000$${salt}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyAdminPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	if (/^[a-f0-9]{64}$/.test(hash)) {
		return timingSafeEqual(await sha256Hex(password), hash);
	}
	if (!isPasswordHash(hash)) return false;
	return timingSafeEqual(
		await hashAdminPassword(password, hash.split("$")[2]),
		hash,
	);
}
