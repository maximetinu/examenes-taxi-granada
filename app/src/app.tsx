import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Mode, Question } from "./types";
import { Store } from "./store";
import { availableYears, buildPool, normalizeText, shuffle, type Filters } from "./quiz";
import { Controls } from "./components/Controls";
import { QuestionItem } from "./components/QuestionItem";
import { Scoreboard } from "./components/Scoreboard";
import questionsData from "./questions.data.json";

// Los datos van INCRUSTADOS en el bundle (import, no fetch): la app es un único
// index.html autocontenido, sin depender de servir /assets/ ni un questions.json aparte.
const QUESTIONS = questionsData as unknown as Question[];

const ALL_SECTIONS = new Set(["general", "ingles", "reserva"] as const);

type Theme = "auto" | "light" | "dark";
const THEME_CYCLE: Theme[] = ["auto", "light", "dark"];
const THEME_META: Record<Theme, { icon: string; label: string }> = {
  auto: { icon: "◐", label: "Auto" },
  light: { icon: "☀", label: "Claro" },
  dark: { icon: "☾", label: "Oscuro" },
};

export function App() {
  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) storeRef.current = new Store();
  const store = storeRef.current;

  const [mode, setMode] = useState<Mode>("quiz");
  const [filters, setFilters] = useState<Filters>({
    sections: new Set(ALL_SECTIONS),
    year: "recent",
    query: "",
  });
  const [streak, setStreak] = useState(0);
  const [statVersion, setStatVersion] = useState(0);
  const [orderKey, setOrderKey] = useState(0);
  const [sort, setSort] = useState<"recent" | "relevance" | "random">("recent");
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem("taximetro.theme");
      return t === "light" || t === "dark" ? t : "auto";
    } catch {
      return "auto";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("taximetro.theme", theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  function cycleTheme() {
    setTheme((t) => THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length]);
  }

  const years = useMemo(() => availableYears(QUESTIONS), []);
  const queryWords = useMemo(
    () => normalizeText(filters.query).split(/\s+/).filter(Boolean),
    [filters.query]
  );
  const agg = useMemo(() => store.aggregate(), [store, statVersion]);

  const basePool = useMemo(() => buildPool(QUESTIONS, filters), [filters]);

  const pool = useMemo(() => {
    if (mode !== "falladas") return basePool;
    const failed = new Set(store.aggregate().failedIds);
    return basePool.filter((q) => failed.has(q.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePool, mode, statVersion]);

  const orderedPool = useMemo(() => {
    if (sort === "random") return shuffle(pool);
    if (sort === "relevance") {
      // Relevancia = más repetidas primero; a igualdad, más reciente primero.
      return [...pool].sort(
        (a, b) =>
          b.dates.length - a.dates.length ||
          b.dates[0].localeCompare(a.dates[0]) ||
          a.id.localeCompare(b.id)
      );
    }
    return pool; // "recent": ya viene por fecha desc desde el banco
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, sort, orderKey]);

  function onResult(id: string, correct: boolean) {
    store.record(id, correct ? "correct" : "wrong");
    setStreak((s) => (correct ? s + 1 : 0));
    setStatVersion((v) => v + 1);
  }

  function resetProgress() {
    if (!confirm("¿Borrar tu progreso guardado en este navegador?")) return;
    store.reset();
    setStreak(0);
    setStatVersion((v) => v + 1);
  }

  const filterKey = `${[...filters.sections].sort().join(",")}-${filters.year}-${mode}`;

  return (
    <div class="shell">
      <header class="masthead">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true">
            🚕
          </span>
          <div>
            <h1 class="brand__name">Taxímetro</h1>
            <p class="brand__sub">Examen del permiso de auto-taxi · Granada</p>
          </div>
        </div>
        <div class="masthead__right">
          <button
            class="theme-toggle"
            onClick={cycleTheme}
            title="Cambiar tema: auto / claro / oscuro"
            aria-label={`Tema: ${THEME_META[theme].label}. Pulsa para cambiar.`}
          >
            <span class="theme-toggle__icon" aria-hidden="true">
              {THEME_META[theme].icon}
            </span>
            {THEME_META[theme].label}
          </button>
          <Scoreboard agg={agg} streak={streak} onReset={resetProgress} />
        </div>
      </header>

      <Controls
        mode={mode}
        setMode={setMode}
        filters={filters}
        setFilters={setFilters}
        years={years}
        poolCount={orderedPool.length}
      />

      {orderedPool.length > 0 && (
        <div class="toolbar">
          <label class="years">
            <span class="years__label">Orden</span>
            <select
              class="years__select"
              value={sort}
              onChange={(e) =>
                setSort((e.target as HTMLSelectElement).value as "recent" | "relevance" | "random")
              }
            >
              <option value="recent">Recientes primero</option>
              <option value="relevance">Relevancia (más repetidas)</option>
              <option value="random">Aleatorio</option>
            </select>
          </label>
          {sort === "random" && (
            <button class="btn btn--ghost btn--small" onClick={() => setOrderKey((k) => k + 1)}>
              ⇄ Barajar
            </button>
          )}
        </div>
      )}

      <main class="stage">
        {orderedPool.length === 0 && (
          <div class="empty">
            {mode === "falladas" ? (
              <p>
                No tienes preguntas falladas con estos filtros. ¡Bien! Cambia de modo o de
                filtros para seguir practicando.
              </p>
            ) : (
              <p>No hay preguntas con estos filtros. Prueba a ampliar sección o año.</p>
            )}
          </div>
        )}

        {orderedPool.length > 0 && (
          <div class="list" key={filterKey}>
            {orderedPool.map((q, i) => (
              <QuestionItem
                key={q.id}
                question={q}
                mode={mode}
                index={i}
                highlight={queryWords}
                onResult={onResult}
              />
            ))}
          </div>
        )}
      </main>

      <footer class="foot">
        <span>{QUESTIONS.length} preguntas de convocatorias reales · datos públicos y abiertos</span>
        <a
          href="https://github.com/maximetinu/examenes-taxi-granada"
          target="_blank"
          rel="noreferrer"
        >
          Código y datos
        </a>
      </footer>
    </div>
  );
}
