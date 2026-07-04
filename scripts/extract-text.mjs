#!/usr/bin/env node
/**
 * Etapa 1 del pipeline: extrae el texto de cada PDF de pdfs/ a extracted-text/.
 *
 *  - PDF con capa de texto  -> pdftotext
 *  - PDF escaneado (imagen) -> pdftoppm (300 dpi) + tesseract (spa+eng) por pagina
 *
 * Es idempotente y cacheable: reescribe extracted-text/<base>.txt en cada corrida.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const PDF_DIR = "pdfs";
const OUT_DIR = "extracted-text";
const MIN_TEXT_CHARS = 100; // por debajo => se considera escaneado y se hace OCR

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function pdftotext(pdf) {
  try {
    return run("pdftotext", ["-enc", "UTF-8", pdf, "-"]);
  } catch {
    return "";
  }
}

function ocr(pdf) {
  const dir = mkdtempSync(join(tmpdir(), "ocr-"));
  try {
    // Renderiza a PNG en escala de grises a 300 dpi
    run("pdftoppm", ["-png", "-gray", "-r", "300", pdf, join(dir, "pg")]);
    const pages = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
    const out = [];
    for (const png of pages) {
      run("tesseract", [join(dir, png), join(dir, "out"), "-l", "spa+eng", "--psm", "6"]);
      out.push(readFileSync(join(dir, "out.txt"), "utf8"));
    }
    return out.join("\n\f\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const pdfs = readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
console.log(`Extrayendo texto de ${pdfs.length} PDFs...\n`);

for (const file of pdfs) {
  const pdf = join(PDF_DIR, file);
  const base = basename(file, ".pdf");
  let text = pdftotext(pdf);
  let method = "pdftotext";
  if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
    process.stdout.write(`  OCR  ${file} ... `);
    text = ocr(pdf);
    method = "tesseract-ocr";
    console.log(`ok (${text.length} chars)`);
  } else {
    console.log(`  text ${file}  (${text.length} chars)`);
  }
  const header = `# fuente: ${file}\n# metodo: ${method}\n# ADVERTENCIA: si el metodo es OCR, revisar/corregir el texto a mano.\n\n`;
  writeFileSync(join(OUT_DIR, `${base}.txt`), header + text, "utf8");
}

console.log(`\nHecho. Textos en ${OUT_DIR}/`);
