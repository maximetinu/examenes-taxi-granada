// Espejo del tipo BankQuestion del pipeline (schema/exam.ts).
export type SectionKind = "general" | "ingles" | "reserva";
export type OptionKey = "a" | "b" | "c" | "d";

export interface Option {
  key: OptionKey;
  text: string;
}

export interface Question {
  id: string;
  sourceExamId: string; // convocatoria representativa (la más reciente)
  section: SectionKind;
  dates: string[]; // todas las convocatorias donde aparece (con esta respuesta), desc
  statement: string;
  options: Option[];
  correctOption: OptionKey;
  explanation: string | null;
}

export const SECTION_LABEL: Record<SectionKind, string> = {
  general: "General",
  ingles: "Inglés",
  reserva: "Reserva",
};

/** Años únicos (desc) en los que aparece la pregunta. */
export function displayYears(q: Question): string[] {
  const ys = new Set(q.dates.map((d) => d.slice(0, 4)));
  return [...ys].sort((a, b) => b.localeCompare(a));
}

export type Mode = "quiz" | "estudio" | "falladas";

// Año a partir del cual se considera "reciente" (normativa vigente).
export const RECENT_FROM = "2022";
