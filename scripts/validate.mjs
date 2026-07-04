#!/usr/bin/env node
/**
 * Valida cada data/exams/<id>.json contra el esquema, consolida data/exams.json
 * y genera el banco plano data/questions.json (solo preguntas jugables).
 *
 * Uso: tsx scripts/validate.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ExamDocument, Dataset, BankQuestion, SCHEMA_VERSION } from "../schema/exam.ts";

const EXAMS_DIR = "data/exams";

const files = readdirSync(EXAMS_DIR).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) {
  console.error(`No hay JSON en ${EXAMS_DIR}/`);
  process.exit(1);
}

const documents = [];
let errors = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(EXAMS_DIR, file), "utf8"));
  const res = ExamDocument.safeParse(raw);
  if (!res.success) {
    errors++;
    console.error(`\n✗ ${file} NO valida:`);
    for (const issue of res.error.issues) {
      console.error(`    ${issue.path.join(".")}: ${issue.message}`);
    }
  } else {
    documents.push(res.data);
    console.log(`✓ ${file}`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} documento(s) invalido(s). No se consolida.`);
  process.exit(1);
}

// Contadores por docType
const counts = {};
for (const d of documents) counts[d.docType] = (counts[d.docType] ?? 0) + 1;

const dataset = Dataset.parse({
  schemaVersion: SCHEMA_VERSION,
  generatedFrom: "data/exams/*.json",
  counts,
  documents,
});
writeFileSync("data/exams.json", JSON.stringify(dataset, null, 2) + "\n");

// Banco plano de preguntas jugables (con deduplicado por contenido)
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^\wáéíóúñü ]/gi, "").trim();
const keyOf = (q) => norm(q.statement) + "||" + q.options.map((o) => norm(o.text)).sort().join("|");

const byKey = new Map(); // key -> primera BankQuestion (fecha más antigua)
let playableTotal = 0;
let duplicatesRemoved = 0;
const conflicts = []; // misma pregunta, distinta respuesta entre exámenes

// Orden cronológico para quedarnos con la aparición más antigua
const ordered = [...documents].sort((a, b) => a.date.localeCompare(b.date));
// Documento truncado que es subconjunto de otro (mismas preguntas) -> fuera del banco
const BANK_EXCLUDE = new Set(["2023-07-18-solo-general"]);
for (const d of ordered) {
  if (d.docType !== "examen" && d.docType !== "examen-resuelto") continue;
  if (BANK_EXCLUDE.has(d.id)) continue;
  for (const section of d.sections) {
    for (const q of section.questions) {
      const playable =
        q.correctOption !== null && q.statement.trim().length > 0 && q.options.length >= 2;
      if (!playable) continue;
      playableTotal++;
      const entry = BankQuestion.parse({
        id: q.id,
        sourceExamId: d.id,
        section: section.kind,
        date: d.date,
        statement: q.statement,
        options: q.options,
        correctOption: q.correctOption,
        explanation: q.explanation ?? null,
      });
      const k = keyOf(q);
      const existing = byKey.get(k);
      if (!existing) {
        byKey.set(k, entry);
      } else {
        duplicatesRemoved++;
        if (existing.correctOption !== entry.correctOption) {
          conflicts.push({ statement: entry.statement.slice(0, 80), a: existing.sourceExamId, b: entry.sourceExamId });
        }
      }
    }
  }
}

const bank = [...byKey.values()];
writeFileSync("data/questions.json", JSON.stringify(bank, null, 2) + "\n");

console.log(`\nOK. ${documents.length} documentos validados.`);
console.log(`  data/exams.json     -> ${JSON.stringify(counts)}`);
console.log(`  data/questions.json -> ${bank.length} preguntas únicas jugables`);
console.log(`  (${playableTotal} jugables en total, ${duplicatesRemoved} duplicadas colapsadas)`);
if (conflicts.length) {
  console.log(`\n  ⚠ ${conflicts.length} pregunta(s) repetida(s) con respuesta DISTINTA entre exámenes:`);
  for (const c of conflicts) console.log(`    "${c.statement}..."  ${c.a} vs ${c.b}`);
}
