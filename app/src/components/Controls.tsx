import type { Mode, SectionKind } from "../types";
import { SECTION_LABEL } from "../types";
import type { Filters } from "../quiz";

const MODES: { id: Mode; label: string }[] = [
  { id: "quiz", label: "Examen" },
  { id: "estudio", label: "Estudio" },
  { id: "falladas", label: "Falladas" },
];

const SECTIONS: SectionKind[] = ["general", "ingles", "reserva"];

export function Controls({
  mode,
  setMode,
  filters,
  setFilters,
  years,
  poolCount,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  years: string[];
  poolCount: number;
}) {
  function toggleSection(s: SectionKind) {
    const next = new Set(filters.sections);
    if (next.has(s)) {
      if (next.size === 1) return; // no dejar cero secciones
      next.delete(s);
    } else {
      next.add(s);
    }
    setFilters({ ...filters, sections: next });
  }

  return (
    <div class="controls">
      <div class="seg" role="tablist" aria-label="Modo">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            class={`seg__btn${mode === m.id ? " is-active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div class="search">
        <span class="search__icon" aria-hidden="true">⌕</span>
        <input
          class="search__input"
          type="search"
          placeholder="Buscar en enunciados y respuestas…"
          value={filters.query}
          onInput={(e) => setFilters({ ...filters, query: (e.target as HTMLInputElement).value })}
          aria-label="Buscar preguntas"
        />
        {filters.query && (
          <button
            class="search__clear"
            onClick={() => setFilters({ ...filters, query: "" })}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      <div class="filters">
        <div class="chips" aria-label="Secciones">
          {SECTIONS.map((s) => (
            <button
              key={s}
              class={`chip${filters.sections.has(s) ? " is-on" : ""}`}
              aria-pressed={filters.sections.has(s)}
              onClick={() => toggleSection(s)}
            >
              {SECTION_LABEL[s]}
            </button>
          ))}
        </div>

        <label class="years">
          <span class="years__label">Año</span>
          <select
            class="years__select"
            value={filters.year}
            onChange={(e) =>
              setFilters({ ...filters, year: (e.target as HTMLSelectElement).value })
            }
          >
            <option value="recent">Recientes (2022+)</option>
            <option value="all">Todas</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p class="controls__count">
        {poolCount} {poolCount === 1 ? "pregunta" : "preguntas"} en juego
      </p>
    </div>
  );
}
