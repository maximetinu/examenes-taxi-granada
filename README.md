# Exámenes taxi Granada

Recopilación de exámenes de aptitud para la obtención del permiso municipal de
conductor/a de auto-taxi en el Área de Prestación Conjunta de Granada, **ingestados
a JSON tipado y validado** para alimentar una web app de estudio.

## Estructura

```
pdfs/                 Los 25 PDF originales (una convocatoria, como máx., por mes)
extracted-text/       Texto de cada PDF (pdftotext / OCR) — etapa intermedia
schema/
  exam.ts             Esquema Zod (fuente de verdad) + tipos TypeScript
  exam.schema.json    JSON Schema generado desde Zod
scripts/
  extract-text.mjs    Etapa 1: extrae texto (pdftotext) u OCR (tesseract) de los PDF
  gen-schema.mjs      Genera schema/exam.schema.json desde Zod
  validate.mjs        Valida data/exams/*.json, consolida y genera el banco
  check_duplicates.py Detecta PDFs con contenido duplicado
data/
  exams/<id>.json     Un documento fiel por examen (validado)
  exams.json          Dataset consolidado { schemaVersion, counts, documents[] }
  questions.json      Banco plano de preguntas JUGABLES (fuente para la app)
  rename_map.txt      Mapeo de los nombres de archivo originales
docs/                 Spec del diseño y guía de extracción
```

## Convención de nombres de los PDF

```
AAAA-MM-DD_taxi-granada_<tipo>.pdf     (AAAA-MM si solo se conoce el mes)
```

`<tipo>`: `examen` (solo preguntas) · `examen-resuelto` (preguntas + respuestas) ·
`plantilla` (solo respuestas) · `resultados` (listado de la convocatoria).

## Modelo de datos (resumen)

Unión discriminada por `docType`. Cada `examen`/`examen-resuelto` tiene `sections[]`
(`general` / `ingles` / `reserva`) con `questions[]`: `{ id, number, statement,
options[{key,text}], correctOption, explanation, image }`. Ver `schema/exam.ts` y
`docs/spec-ingesta-examenes.md` para el detalle.

- **`data/questions.json`** es el banco que consume la app: solo preguntas jugables
  (con enunciado, ≥2 opciones y respuesta correcta conocida), deduplicadas por
  contenido. Cada entrada trae `id`, `sourceExamId`, `section`, `date`, `statement`,
  `options`, `correctOption`, `explanation`.

## Cómo regenerar

```bash
npm install
node scripts/extract-text.mjs   # etapa 1 (solo si cambian los PDF)
npx tsx scripts/gen-schema.mjs  # regenera el JSON Schema
npx tsx scripts/validate.mjs    # valida + consolida exams.json y questions.json
```

## Notas de la ingesta

- Las respuestas correctas de muchos exámenes van marcadas **en negrita** (o con un
  círculo en los escaneos); `pdftotext` las pierde, así que se recuperaron leyendo la
  fuente en negrita (pdftohtml / PyMuPDF) o mirando las imágenes de página.
- Nunca se inventan respuestas: una pregunta sin respuesta fiable queda con
  `correctOption: null` y fuera del banco jugable.
- El documento de `resultados` no contiene datos personales (nombres/DNI se omiten).
- Correcciones aplicadas durante la ingesta: se afinaron fechas a partir del contenido
  (p. ej. el antiguo `plantillaexamen160517` era del **16/05/2017**, no 2016) y los
  PDF escaneados etiquetados `plantilla` resultaron ser exámenes corregidos
  (`examen-resuelto`), por lo que se renombraron.
