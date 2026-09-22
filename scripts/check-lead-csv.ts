// Dados sintéticos, sem I/O externo. Uso: bun scripts/check-lead-csv.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { escapeCsv } from "../src/lib/leads/csv";

const context = createContext({});
runInContext(
	readFileSync(new URL("./apps-script/Code.gs", import.meta.url), "utf8"),
	context,
);

for (const prefix of [
	"",
	" ",
	"\t",
	"\n",
	"\r",
	"\uFEFF",
	"\u0000",
	"\u001F",
	"\u200B",
]) {
	for (const operator of ["=", "+", "-", "@"]) {
		const input = `${prefix}${operator}1+1`;
		assert.equal(escapeCsv(input), `"'${input}"`);
		context.cell = input;
		assert.equal(runInContext("sheetCell_(cell)", context), `'${input}`);
	}
}
assert.equal(
	escapeCsv('Maria "Silva", profissional'),
	'"Maria ""Silva"", profissional"',
);
assert.equal(escapeCsv(" "), '" "');
assert.equal(escapeCsv("texto\ncom linha"), '"texto\ncom linha"');
assert.equal(escapeCsv(null), '""');
assert.equal(escapeCsv(12), '"12"');
assert.equal(
	escapeCsv({ utm_source: "=teste" }),
	'"{""utm_source"":""=teste""}"',
);

let written: unknown[][] = [];
const range = {
	setNumberFormat: () => range,
	setValues: (values: unknown[][]) => {
		written = values;
	},
};
context.sheet = {
	getMaxRows: () => 10,
	getRange: (_row: number, _column: number, height: number, width: number) => {
		assert.equal(height, 1);
		assert.equal(width, 18);
		return range;
	},
};
context.lead = {
	id: "fixture",
	createdAt: "2026-09-22",
	updatedAt: "2026-09-22",
	name: "=1+1",
	email: "fixture@example.test",
	phone: "+5511999990000",
	profession: "\uFEFF@formula",
	status: "novo",
	consent: true,
	utm: { utm_source: "=formula" },
};
runInContext("writeRow_(sheet, 2, lead)", context);
assert.equal(written.length, 1);
assert.equal(written[0].length, 18);
assert.equal(written[0][3], "'=1+1");
assert.equal(written[0][4], "fixture@example.test");
assert.equal(written[0][5], "'+5511999990000");
assert.equal(written[0][6], "'\uFEFF@formula");
assert.equal(written[0][15], "'=formula");
console.log(
	"PASS CSV/Sheets: fórmulas neutralizadas após espaços/controles/BOM; escape CSV preservado e writeRow_ mantém 18 colunas.",
);
