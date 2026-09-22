// Check isolado: executa o Code.gs real com PropertiesService/MailApp simulados.
// Não acessa planilha, e-mail nem credenciais reais. Uso: bun scripts/check-admin-auth.ts
import assert from "node:assert/strict";
import { pbkdf2Sync, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { hashAdminPassword, sha256Hex } from "../src/lib/server/admin-password";
import {
	requestAdminRecovery,
	resetAdminPassword,
} from "../src/lib/server/admin-recovery";
import {
	createAdminSession,
	readAdminSessionToken,
	verifyAdminLogin,
} from "../src/lib/server/auth";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const originalDeriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
let passwordDerivations = 0;
const properties = new Map<string, string>();
const mail: { to: string; body: string }[] = [];
let mailFails = false;
let now = Date.now();
let locked = false;
class StoreDate extends Date {
	static now() {
		return now;
	}
}
const context = createContext({
	Date: StoreDate,
	PropertiesService: {
		getScriptProperties: () => ({
			getProperty: (key: string) => properties.get(key) ?? null,
			setProperty: (key: string, value: string) => properties.set(key, value),
			deleteProperty: (key: string) => properties.delete(key),
		}),
	},
	LockService: {
		getScriptLock: () => ({
			tryLock: () => {
				if (locked) return false;
				locked = true;
				return true;
			},
			releaseLock: () => {
				locked = false;
			},
		}),
	},
	MailApp: {
		getRemainingDailyQuota: () => 100,
		sendEmail: (value: { to: string; body: string }) => {
			if (mailFails) throw new Error("fixture_mail_unavailable");
			mail.push(value);
		},
	},
	Utilities: { getUuid: randomUUID },
});
runInContext(
	readFileSync(new URL("./apps-script/Code.gs", import.meta.url), "utf8"),
	context,
);
const handle = (body: unknown) => {
	context.input = body;
	return runInContext("handle_(input)", context);
};
const storeKey = "NA_MESA_ADMIN_USER_COMERCIAL";
const password = "fixture-bootstrap-long-password";
const replacement = "fixture-replacement-long-password";
const salt = "000102030405060708090a0b0c0d0e0f";
const hash = await hashAdminPassword(password, salt);
assert.equal(
	hash.split("$")[3],
	pbkdf2Sync(password, Buffer.from(salt, "hex"), 600000, 32, "sha256").toString(
		"hex",
	),
);

try {
	crypto.subtle.deriveBits = (...args) => {
		passwordDerivations++;
		return originalDeriveBits(...args);
	};
	Object.assign(process.env, {
		ADMIN_USERS: JSON.stringify([
			{ username: "COMERCIAL", passwordHash: hash, role: "vendas" },
		]),
		ADMIN_SESSION_SECRET: "fixture-session-secret-with-at-least-32-characters",
		ADMIN_PASSWORD_RECOVERY_ENABLED: "true",
		ADMIN_APP_ORIGIN: "https://admin.example.test",
		SHEETS_WEBAPP_URL: "https://store.example.test/exec",
		SHEETS_SHARED_SECRET: "fixture-store-secret",
	});
	properties.set("SHARED_SECRET", "fixture-store-secret");
	globalThis.fetch = async (_input, init) => {
		const body = JSON.parse(String(init?.body));
		return Response.json(handle(body));
	};

	assert.equal(
		handle({
			secret: "wrong",
			action: "adminAuth",
			payload: { username: "COMERCIAL" },
		}).ok,
		false,
	);
	assert.equal(await verifyAdminLogin("COMERCIAL", "wrong"), null);
	const user = await verifyAdminLogin("COMERCIAL", password);
	assert.ok(user);
	const session = await createAdminSession(user);
	assert.ok(session);
	assert.ok(await readAdminSessionToken(session));
	assert.equal(await readAdminSessionToken(`${session}x`), null);

	assert.equal(await requestAdminRecovery(), true);
	assert.equal(mail.length, 1);
	assert.equal(mail[0].to, "suporte@drasacha.com.br");
	const token = /#token=([a-f0-9]{64})/.exec(mail[0].body)?.[1];
	assert.ok(token);
	assert.equal(properties.get(storeKey)?.includes(token), false);
	assert.equal(
		JSON.parse(properties.get(storeKey) ?? "{}").reset.digest,
		await sha256Hex(token),
	);
	await assert.rejects(requestAdminRecovery());
	assert.equal(mail.length, 1);
	const beforeInvalidToken = passwordDerivations;
	assert.equal(await resetAdminPassword("0".repeat(64), replacement), false);
	assert.equal(passwordDerivations, beforeInvalidToken);
	properties.set(
		"NA_MESA_ADMIN_RESET",
		JSON.stringify({ startedAt: now, count: 10 }),
	);
	await assert.rejects(resetAdminPassword(token, replacement));
	assert.equal(passwordDerivations, beforeInvalidToken);
	properties.delete("NA_MESA_ADMIN_RESET");
	assert.equal(await resetAdminPassword(token, "short"), false);
	assert.equal(await resetAdminPassword(token, replacement), true);
	assert.equal(await resetAdminPassword(token, replacement), false);
	assert.equal(await readAdminSessionToken(session), null);
	assert.equal(await verifyAdminLogin("COMERCIAL", password), null);
	assert.ok(await verifyAdminLogin("COMERCIAL", replacement));
	assert.equal(JSON.parse(properties.get(storeKey) ?? "{}").reset, undefined);

	now += 61000;
	assert.equal(await requestAdminRecovery(), true);
	const expired = /#token=([a-f0-9]{64})/.exec(mail[1].body)?.[1];
	assert.ok(expired);
	now += 16 * 60000;
	const beforeExpiredToken = passwordDerivations;
	assert.equal(await resetAdminPassword(expired, password), false);
	assert.equal(passwordDerivations, beforeExpiredToken);
	const beforeMailFailure = properties.get(storeKey);
	mailFails = true;
	await assert.rejects(requestAdminRecovery());
	assert.equal(properties.get(storeKey), beforeMailFailure);
	assert.equal(mail.length, 2);

	properties.delete("NA_MESA_ADMIN_LOGIN");
	for (let index = 0; index < 20; index++) {
		assert.equal(
			handle({
				secret: "fixture-store-secret",
				action: "adminAuth",
				payload: { username: "COMERCIAL", login: true },
			}).ok,
			true,
		);
	}
	assert.equal(
		handle({
			secret: "fixture-store-secret",
			action: "adminAuth",
			payload: { username: "COMERCIAL", login: true },
		}).ok,
		false,
	);
	properties.delete("NA_MESA_ADMIN_LOGIN");
	properties.set("SHARED_SECRET", "rotated-store-secret");
	assert.equal(await readAdminSessionToken(session), null);
	await assert.rejects(verifyAdminLogin("COMERCIAL", password));
	console.log(
		"PASS admin: PBKDF2, login, assinatura, envio fixo, digest, expiração, uso único, revogação, falha fechada, rate limit e rollback do e-mail; zero I/O externo.",
	);
} finally {
	crypto.subtle.deriveBits = originalDeriveBits;
	globalThis.fetch = originalFetch;
	for (const name of Object.keys(process.env))
		if (!(name in originalEnv)) delete process.env[name];
	Object.assign(process.env, originalEnv);
}
