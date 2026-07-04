#!/usr/bin/env node
/** Copia el banco de preguntas del pipeline de datos a public/ antes de dev/build. */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "data", "questions.json");
const destDir = join(here, "..", "public");
const dest = join(destDir, "questions.json");

if (!existsSync(src)) {
  console.error(`No existe ${src}. Ejecuta antes 'npx tsx scripts/validate.mjs' en la raíz.`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copiado questions.json -> public/`);
