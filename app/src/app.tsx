import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Mode, Option, OptionKey, Question } from "./types";
import { Store } from "./store";
import { availableYears, buildPool, pickRandom, shuffledOptions, type Filters } from "./quiz";
import { Controls } from "./components/Controls";
import { QuestionCard } from "./components/QuestionCard";
import { Scoreboard } from "./components/Scoreboard";
import { RoofLight, type RoofState } from "./components/RoofLight";

const ALL_SECTIONS = new Set(["general", "ingles", "reserva"] as const);

export function App() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) storeRef.current = new Store();
  const store = storeRef.current;

  const [mode, setMode] = useState<Mode>("quiz");
  const [filters, setFilters] = useState<Filters>({
    sections: new Set(ALL_SECTIONS),
    year: "recent",
  });

  const [current, setCurrent] = useState<Question | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [chosen, setChosen] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [studyIndex, setStudyIndex] = useState(0);
  const [statVersion, setStatVersion] = useState(0);

  // Carga del banco de preguntas
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}questions.json`)
      .then((r) => r.json())
      .then((d: Question[]) => setQuestions(d))
      .catch(() => setLoadError(true));
  }, []);

  const years = useMemo(() => (questions ? availableYears(questions) : []), [questions]);
  const agg = useMemo(() => store.aggregate(), [store, statVersion]);

  // Pool actual según modo/filtros (para 'falladas' lee las falladas en vivo)
  function currentPool(): Question[] {
    if (!questions) return [];
    const failed = mode === "falladas" ? new Set<string>(store.aggregate().failedIds) : undefined;
    return buildPool(questions, filters, failed);
  }
  const pool = useMemo(currentPool, [questions, filters, mode, statVersion]);

  function showQuiz(q: Question | null) {
    setCurrent(q);
    setOptions(q ? shuffledOptions(q) : []);
    setChosen(null);
    setRevealed(false);
  }

  function showStudy(pIndex: number, p = currentPool()) {
    const q = p[pIndex] ?? null;
    setStudyIndex(pIndex);
    setCurrent(q);
    setOptions(q ? q.options : []);
    setChosen(null);
    setRevealed(true);
  }

  // (Re)inicia el flujo al cambiar modo/filtros o al cargar los datos
  useEffect(() => {
    if (!questions) return;
    const p = currentPool();
    if (mode === "estudio") showStudy(0, p);
    else showQuiz(pickRandom(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, mode, filters]);

  function choose(key: OptionKey) {
    if (!current || revealed || mode === "estudio") return;
    const ok = key === current.correctOption;
    store.record(current.id, ok ? "correct" : "wrong");
    setChosen(key);
    setRevealed(true);
    setStreak((s) => (ok ? s + 1 : 0));
    setStatVersion((v) => v + 1);
  }

  function next() {
    showQuiz(pickRandom(currentPool(), current?.id));
  }

  function resetProgress() {
    if (!confirm("¿Borrar tu progreso guardado en este navegador?")) return;
    store.reset();
    setStreak(0);
    setStatVersion((v) => v + 1);
  }

  const roof: RoofState =
    mode === "estudio" ? "study" : revealed ? (chosen === current?.correctOption ? "correct" : "wrong") : "idle";

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
        <Scoreboard agg={agg} streak={streak} onReset={resetProgress} />
      </header>

      {questions && (
        <Controls
          mode={mode}
          setMode={setMode}
          filters={filters}
          setFilters={setFilters}
          years={years}
          poolCount={pool.length}
        />
      )}

      <main class="stage">
        <RoofLight state={roof} />

        {loadError && (
          <p class="notice">No se pudieron cargar las preguntas. Recarga la página.</p>
        )}

        {!loadError && !questions && <p class="notice">Cargando preguntas…</p>}

        {questions && !current && (
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

        {questions && current && (
          <>
            <QuestionCard
              question={current}
              options={options}
              mode={mode}
              chosen={chosen}
              revealed={revealed}
              onChoose={choose}
            />

            {mode === "estudio" ? (
              <nav class="nav">
                <button
                  class="btn btn--ghost"
                  onClick={() => showStudy(Math.max(0, studyIndex - 1))}
                  disabled={studyIndex === 0}
                >
                  ← Anterior
                </button>
                <span class="nav__pos">
                  {studyIndex + 1} / {pool.length}
                </span>
                <button
                  class="btn btn--ghost"
                  onClick={() => showStudy(Math.min(pool.length - 1, studyIndex + 1))}
                  disabled={studyIndex >= pool.length - 1}
                >
                  Siguiente →
                </button>
              </nav>
            ) : (
              <div class="nav nav--center">
                <button class="btn btn--primary" onClick={next} disabled={!revealed}>
                  Siguiente pregunta →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer class="foot">
        <span>
          {questions?.length ?? 0} preguntas de convocatorias reales · datos abiertos
        </span>
        <a href="https://github.com/maximetinu/examenes-taxi-granada" target="_blank" rel="noreferrer">
          Código y datos
        </a>
      </footer>
    </div>
  );
}
