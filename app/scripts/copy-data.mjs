#!/usr/bin/env node
/**
 * Copia los datos del pipeline a src/ para importarlos en el bundle.
 * Al importarse (no fetch), quedan incrustados en index.html por
 * vite-plugin-singlefile → la app es un único fichero autocontenido.
 *   - questions.json  -> banco plano para práctica libre.
 *   - exams-app.json  -> exámenes por convocatoria, en orden.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");
const destDir = join(here, "..", "src");
mkdirSync(destDir, { recursive: true });

const files = [
  ["questions.json", "questions.data.json"],
  ["exams-app.json", "exams.data.json"],
];

for (const [src, dest] of files) {
  const s = join(dataDir, src);
  if (!existsSync(s)) {
    console.error(`No existe ${s}. Ejecuta antes 'npx tsx scripts/validate.mjs' en la raíz.`);
    process.exit(1);
  }
  copyFileSync(s, join(destDir, dest));
  console.log(`Copiado ${src} -> src/${dest}`);
}
