import type { Option, Question, SectionKind } from "./types";
import { RECENT_FROM } from "./types";

export interface Filters {
  sections: Set<SectionKind>;
  year: string; // "recent" | "all" | "YYYY"
  query: string; // texto de búsqueda libre
}

/** Minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Fisher-Yates: baraja una copia del array. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function availableYears(questions: readonly Question[]): string[] {
  const years = new Set<string>();
  for (const q of questions) for (const d of q.dates) years.add(d.slice(0, 4));
  return [...years].sort((a, b) => b.localeCompare(a));
}

function matchesYear(q: Question, year: string): boolean {
  if (year === "all") return true;
  const ys = q.dates.map((d) => d.slice(0, 4));
  if (year === "recent") return ys.some((y) => y >= RECENT_FROM);
  return ys.includes(year);
}

/** Aplica filtros de sección y año. `failedIds` restringe a preguntas falladas (modo falladas). */
export function buildPool(
  questions: readonly Question[],
  filters: Filters,
  failedIds?: ReadonlySet<string>
): Question[] {
  const words = normalizeText(filters.query).split(/\s+/).filter(Boolean);
  return questions.filter((q) => {
    if (!filters.sections.has(q.section)) return false;
    if (!matchesYear(q, filters.year)) return false;
    if (failedIds && !failedIds.has(q.id)) return false;
    if (words.length) {
      const hay = normalizeText(q.statement + " " + q.options.map((o) => o.text).join(" "));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** Elige una pregunta al azar del pool, evitando repetir la anterior si hay alternativas. */
export function pickRandom(pool: readonly Question[], excludeId?: string): Question | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  let q = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (excludeId && q.id === excludeId && guard++ < 8) {
    q = pool[Math.floor(Math.random() * pool.length)];
  }
  return q;
}

/** Opciones barajadas de una pregunta (para no revelar la correcta por posición). */
export function shuffledOptions(q: Question): Option[] {
  return shuffle(q.options);
}
