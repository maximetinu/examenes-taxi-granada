import { z } from "zod";

/**
 * Esquema único (fuente de verdad) de los exámenes de taxi de Granada.
 * De aquí se infieren los tipos TS y se genera el JSON Schema (gen-schema.mjs).
 */

export const DocType = z.enum([
  "examen", // solo preguntas, sin respuestas
  "examen-resuelto", // preguntas + respuestas correctas
  "plantilla", // solo la rejilla de respuestas correctas
  "resultados", // listado de resultados de la convocatoria (sin datos personales)
]);
export type DocType = z.infer<typeof DocType>;

export const SectionKind = z.enum([
  "general", // Cuestionario general
  "ingles", // Cuestionario de inglés
  "reserva", // Preguntas de reserva
]);
export type SectionKind = z.infer<typeof SectionKind>;

export const OptionKey = z.enum(["a", "b", "c", "d"]);
export type OptionKey = z.infer<typeof OptionKey>;

export const DatePrecision = z.enum(["day", "month"]);
export type DatePrecision = z.infer<typeof DatePrecision>;

/** Fecha ISO: "YYYY-MM-DD" (precision 'day') o "YYYY-MM" (precision 'month'). */
export const ExamDate = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Fecha debe ser YYYY-MM o YYYY-MM-DD");

export const Option = z.object({
  key: OptionKey,
  text: z.string().min(1),
});
export type Option = z.infer<typeof Option>;

export const Question = z
  .object({
    /** ID estable y único global: "<examId>-<section>-<number>". */
    id: z.string().min(1),
    number: z.number().int().positive(),
    statement: z.string().min(1),
    options: z.array(Option),
    /** Clave de la opción correcta, o null si se desconoce (pregunta no jugable). */
    correctOption: OptionKey.nullable(),
    /** Justificación de la respuesta, si el documento la incluye. */
    explanation: z.string().nullable().default(null),
    /** Referencia a imagen si la pregunta la necesita (p. ej. mapa escaneado). */
    image: z.string().nullable().default(null),
  })
  .strict()
  .refine(
    (q: { correctOption: OptionKey | null; options: Option[] }) =>
      q.correctOption === null || q.options.some((o) => o.key === q.correctOption),
    { message: "correctOption debe corresponder a una de las opciones presentes" }
  );
export type Question = z.infer<typeof Question>;

export const Section = z
  .object({
    kind: SectionKind,
    title: z.string().min(1),
    questions: z.array(Question),
  })
  .strict();
export type Section = z.infer<typeof Section>;

/** Metadatos comunes a todos los documentos. */
const Meta = {
  id: z.string().min(1),
  sourceFile: z.string().min(1),
  date: ExamDate,
  datePrecision: DatePrecision,
  convocatoria: z.string().nullable().default(null),
  organo: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
};

export const AnswerEntry = z
  .object({
    section: SectionKind,
    number: z.number().int().positive(),
    correct: OptionKey,
  })
  .strict();
export type AnswerEntry = z.infer<typeof AnswerEntry>;

/** examen / examen-resuelto: preguntas por secciones. */
export const ExamWithSections = z
  .object({
    ...Meta,
    docType: z.enum(["examen", "examen-resuelto"]),
    sections: z.array(Section),
  })
  .strict();

/** plantilla: solo la rejilla de respuestas. */
export const AnswerKeyDoc = z
  .object({
    ...Meta,
    docType: z.literal("plantilla"),
    answerKey: z.array(AnswerEntry),
  })
  .strict();

/** resultados: solo resumen, sin datos personales. */
export const ResultsDoc = z
  .object({
    ...Meta,
    docType: z.literal("resultados"),
    summary: z.string().min(1),
  })
  .strict();

export const ExamDocument = z.discriminatedUnion("docType", [
  ExamWithSections,
  AnswerKeyDoc,
  ResultsDoc,
]);
export type ExamDocument = z.infer<typeof ExamDocument>;

/** Dataset consolidado. */
export const Dataset = z
  .object({
    schemaVersion: z.number().int().positive(),
    generatedFrom: z.string(),
    counts: z.record(z.string(), z.number()),
    documents: z.array(ExamDocument),
  })
  .strict();
export type Dataset = z.infer<typeof Dataset>;

/** Entrada del banco plano de preguntas jugables (derivado, para la app). */
export const BankQuestion = z
  .object({
    id: z.string().min(1),
    sourceExamId: z.string().min(1), // convocatoria representativa (la más reciente)
    section: SectionKind,
    /** Todas las convocatorias donde aparece la pregunta CON ESTA respuesta (desc). */
    dates: z.array(ExamDate).min(1),
    statement: z.string().min(1),
    options: z.array(Option).min(2),
    correctOption: OptionKey,
    explanation: z.string().nullable(),
  })
  .strict();
export type BankQuestion = z.infer<typeof BankQuestion>;

export const SCHEMA_VERSION = 1;
