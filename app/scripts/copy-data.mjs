#!/usr/bin/env node
/**
 * Copia el banco de preguntas del pipeline a src/ para importarlo en el bundle.
 * Al importarse (no fetch), queda incrustado dentro de index.html por
 * vite-plugin-singlefile → la app es un único fichero autocontenido.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "data", "questions.json");
const destDir = join(here, "..", "src");
const dest = join(destDir, "questions.data.json");

if (!existsSync(src)) {
  console.error(`No existe ${src}. Ejecuta antes 'npx tsx scripts/validate.mjs' en la raíz.`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copiado questions.json -> src/questions.data.json`);
