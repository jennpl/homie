import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prdPath = path.join(root, "docs", "PRD.md");
const specPath = path.join(root, "docs", "ENGINEERING_SPEC.md");
const checkOnly = process.argv.includes("--check");
const begin = "<!-- BEGIN GENERATED PRD -->";
const end = "<!-- END GENERATED PRD -->";

const normalize = (value) => value.replace(/\r\n/g, "\n").trimEnd() + "\n";
const prd = normalize(await readFile(prdPath, "utf8"));
const currentSpec = normalize(await readFile(specPath, "utf8"));
const digest = createHash("sha256").update(prd).digest("hex");

const startIndex = currentSpec.indexOf(begin);
const endIndex = currentSpec.indexOf(end);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  throw new Error("Engineering spec is missing valid generated PRD markers.");
}

const snapshot = `${begin}\n\n${prd.trimEnd()}\n\n${end}`;
const withSnapshot =
  currentSpec.slice(0, startIndex) + snapshot + currentSpec.slice(endIndex + end.length);
const expected = normalize(
  withSnapshot.replace(
    /<!-- prd-sha256: [a-f0-9]+|<!-- prd-sha256: pending/,
    `<!-- prd-sha256: ${digest}`,
  ),
);

if (checkOnly) {
  if (currentSpec !== expected) {
    console.error("ENGINEERING_SPEC.md is out of sync with PRD.md.");
    console.error("Run: npm run docs:sync");
    process.exit(1);
  }
  console.log(`Engineering spec is synced to PRD ${digest.slice(0, 12)}.`);
} else {
  await writeFile(specPath, expected, "utf8");
  console.log(`Synchronized engineering spec to PRD ${digest.slice(0, 12)}.`);
}

