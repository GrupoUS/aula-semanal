#!/usr/bin/env bun
// Lê a senha de stdin (sem argumento/histórico) e gera passwordHash PBKDF2.
import { readFileSync } from "node:fs";
import { hashAdminPassword } from "../src/lib/server/admin-password.ts";

const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
if (password.length < 12 || password.length > 128) {
	console.error(
		"Forneça uma senha de 12 a 128 caracteres pela entrada padrão.",
	);
	process.exit(1);
}

process.stdout.write(`${await hashAdminPassword(password)}\n`);
