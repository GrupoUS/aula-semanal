#!/usr/bin/env node
// Gera o SHA-256 hex de uma senha para o campo passwordSha256 de ADMIN_USERS.
// Uso: node scripts/admin-password-hash.mjs "<senha>"
import { createHash } from "node:crypto";

const password = process.argv[2];
if (!password) {
	console.error('Uso: node scripts/admin-password-hash.mjs "<senha>"');
	process.exit(1);
}

process.stdout.write(
	`${createHash("sha256").update(password).digest("hex")}\n`,
);
