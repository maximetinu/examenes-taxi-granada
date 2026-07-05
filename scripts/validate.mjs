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

// Banco plano de preguntas jugables.
// Deduplicado CONSCIENTE DE LA RESPUESTA: misma pregunta + misma respuesta en varias
// convocatorias -> una entrada con todas las fechas. Si la respuesta CAMBIA entre años
// (cambio de normativa) -> entradas separadas, cada una con sus fechas.
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^\wáéíóúñü ]/gi, "").trim();
const contentKey = (q) => norm(q.statement) + "||" + q.options.map((o) => norm(o.text)).sort().join("|");
const answerKey = (q) => contentKey(q) + "##" + q.correctOption;

// group por (contenido+respuesta) -> { rep, dates:Set }
const groups = new Map();
// group por contenido (sin respuesta) -> Set de respuestas distintas (para detectar cambios)
const answersByContent = new Map();
let playableTotal = 0;

// Documento truncado que es subconjunto de otro (mismas preguntas) -> fuera del banco
const BANK_EXCLUDE = new Set(["2023-07-18-solo-general"]);
// Orden cronológico ASC: así el "representante" acaba siendo la aparición más reciente
const ordered = [...documents].sort((a, b) => a.date.localeCompare(b.date));
for (const d of ordered) {
  if (d.docType !== "examen" && d.docType !== "examen-resuelto") continue;
  if (BANK_EXCLUDE.has(d.id)) continue;
  for (const section of d.sections) {
    for (const q of section.questions) {
      const playable =
        q.correctOption !== null && q.statement.trim().length > 0 && q.options.length >= 2;
      if (!playable) continue;
      playableTotal++;

      const ck = contentKey(q);
      if (!answersByContent.has(ck)) answersByContent.set(ck, new Set());
      answersByContent.get(ck).add(q.correctOption);

      const ak = answerKey(q);
      const g = groups.get(ak);
      if (!g) {
        groups.set(ak, {
          rep: { q, section: section.kind, examId: d.id },
          dates: new Set([d.date]),
        });
      } else {
        g.dates.add(d.date);
        g.rep = { q, section: section.kind, examId: d.id }; // el más reciente (orden ASC)
      }
    }
  }
}

const bank = [];
for (const g of groups.values()) {
  const { q, section, examId } = g.rep;
  const dates = [...g.dates].sort((a, b) => b.localeCompare(a)); // desc
  bank.push(
    BankQuestion.parse({
      id: q.id,
      sourceExamId: examId,
      section,
      dates,
      statement: q.statement,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation ?? null,
    })
  );
}
bank.sort((a, b) => b.dates[0].localeCompare(a.dates[0]) || a.id.localeCompare(b.id));
writeFileSync("data/questions.json", JSON.stringify(bank, null, 2) + "\n");

// ---- Exámenes por convocatoria, en orden (para hacerlos completos en la app) ----
// Solo los "resueltos" (con respuestas), excluyendo el truncado solo-general.
const appExams = [];
for (const d of documents) {
  if (d.docType !== "examen-resuelto") continue;
  if (d.id === "2023-07-18-solo-general") continue;
  const sections = d.sections
    .map((s) => ({
      kind: s.kind,
      title: s.title,
      questions: s.questions
        .filter((q) => q.statement.trim().length > 0 && q.options.length >= 2)
        .map((q) => ({
          id: q.id,
          sourceExamId: d.id,
          section: s.kind,
          dates: [d.date],
          number: q.number,
          statement: q.statement,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation ?? null,
        })),
    }))
    .filter((s) => s.questions.length > 0);
  const all = sections.flatMap((s) => s.questions);
  if (all.length === 0) continue;
  appExams.push({
    id: d.id,
    date: d.date,
    datePrecision: d.datePrecision,
    convocatoria: d.convocatoria ?? null,
    organo: d.organo ?? null,
    total: all.length,
    scorable: all.filter((q) => q.correctOption !== null).length,
    sections,
  });
}
appExams.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync("data/exams-app.json", JSON.stringify(appExams, null, 2) + "\n");

// Preguntas cuya respuesta correcta cambió entre convocatorias (útil: normativa cambiante)
const changed = [...answersByContent.values()].filter((set) => set.size > 1).length;

console.log(`\nOK. ${documents.length} documentos validados.`);
console.log(`  data/exams.json     -> ${JSON.stringify(counts)}`);
console.log(`  data/questions.json -> ${bank.length} preguntas jugables (de ${playableTotal} apariciones)`);
console.log(`  ${playableTotal - bank.length} apariciones colapsadas; ${changed} pregunta(s) con respuesta que cambió entre años.`);
