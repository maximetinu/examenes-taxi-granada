# Spec — Ingesta de exámenes de taxi a JSON tipado

Fecha: 2026-07-04

## Objetivo

Extraer el contenido de los PDF de exámenes de taxi de Granada a JSON fuertemente
tipado y validado, para alimentar una **web app de estudio** que:

- muestra preguntas al azar,
- enseña las posibles respuestas sin desvelar la correcta,
- indica si el usuario acierta o falla (y, si hay, explica por qué).

## Decisiones acordadas

- **Esquema:** Zod (TypeScript) como única fuente de verdad → tipos TS inferidos +
  validación en runtime. Se exporta además `schema/exam.schema.json` (JSON Schema)
  para consumidores no-TS.
- **Alcance:** se modelan los 25 documentos en una unión discriminada por `docType`
  (`examen`, `examen-resuelto`, `plantilla`, `resultados`). Nada se descarta.
- **Ejecución de la estructuración:** subagentes en paralelo (uno por PDF), cada
  JSON validado contra el esquema antes de consolidar.

## Pipeline (2 etapas)

1. **Extracción de texto (mecánica, cacheable):** `pdftotext` para PDF con texto;
   `pdftoppm` + `tesseract` (spa+eng) para los escaneados. Salida: un `.txt` por
   PDF en `extracted-text/`. Se versiona y se puede corregir a mano.
2. **Estructuración semántica (agente):** cada `.txt` → JSON validado. No es un
   parser genérico: cada PDF numera/columna/marca respuestas distinto.

## Modelo de datos

```
DocType   = 'examen' | 'examen-resuelto' | 'plantilla' | 'resultados'
Section   = 'general' | 'ingles' | 'reserva'
OptionKey = 'a' | 'b' | 'c' | 'd'

Meta = {
  id, sourceFile, date, datePrecision: 'day' | 'month',
  convocatoria | null, organo | null, docType, notes | null
}

Option   = { key: OptionKey, text: string }
Question = {
  id,                       // "<examId>-<section>-<number>", estable y único
  number, statement,
  options: Option[],
  correctOption: OptionKey | null,   // null = respuesta desconocida (no jugable)
  explanation: string | null,        // justificación si el PDF la trae
  image: string | null               // ref a imagen si la pregunta la necesita
}
Section  = { kind: Section, title, questions: Question[] }

// Unión discriminada por docType:
examen | examen-resuelto → Meta & { sections: Section[] }
plantilla                → Meta & { answerKey: [{ section, number, correct }] }
resultados               → Meta & { summary }   // SIN datos personales (PII)
```

### Salidas

- `data/exams/<id>.json` — un documento fiel por PDF (validado).
- `data/exams.json` — dataset consolidado: `{ schemaVersion, generatedFrom, counts, documents[] }`.
- `data/questions.json` — **banco plano de preguntas jugables** (las que tienen
  enunciado + ≥2 opciones + `correctOption`), fuente directa para la app. Cada
  entrada: `{ id, section, sourceExamId, statement, options, correctOption, explanation }`.

## Reglas

- **Jugable** = tiene enunciado + ≥2 opciones + `correctOption != null`.
- **No se inventan respuestas.** Pregunta sin respuesta autorizada se guarda pero
  queda fuera del banco jugable.
- **Emparejamiento examen↔plantilla:** se intenta rellenar respuestas de un
  `examen` con su `plantilla` de la misma fecha cuando exista.
- **Privacidad:** el doc `resultados` NO transcribe nombres/DNI; solo metadatos.
- **Reclasificación:** un PDF-imagen etiquetado `plantilla` que, tras OCR, resulte
  ser el examen escaneado completo, se reclasifica y se renombra en consecuencia.
- **Validación como puerta:** todo JSON se valida con Zod antes de consolidar.

## Estructura del repo

```
pdfs/                 PDFs (movidos desde la raíz)
extracted-text/       Etapa 1: un .txt por PDF
schema/exam.ts        Esquemas Zod + tipos
schema/exam.schema.json  JSON Schema generado
scripts/extract-text.mjs pdftotext / OCR
scripts/gen-schema.mjs   emite JSON Schema desde Zod
scripts/validate.mjs     valida data/*.json y genera questions.json
data/                 Salidas JSON
```
