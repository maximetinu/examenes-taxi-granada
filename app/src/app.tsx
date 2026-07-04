import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Mode, Question } from "./types";
import { Store } from "./store";
import { availableYears, buildPool, shuffle, type Filters } from "./quiz";
import { Controls } from "./components/Controls";
import { QuestionItem } from "./components/QuestionItem";
import { Scoreboard } from "./components/Scoreboard";

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
  const [streak, setStreak] = useState(0);
  const [statVersion, setStatVersion] = useState(0);
  const [orderKey, setOrderKey] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}questions.json`)
      .then((r) => r.json())
      .then((d: Question[]) => setQuestions(d))
      .catch(() => setLoadError(true));
  }, []);

  const years = useMemo(() => (questions ? availableYears(questions) : []), [questions]);
  const agg = useMemo(() => store.aggregate(), [store, statVersion]);

  // Pool base (sección + año), estable frente a respuestas
  const basePool = useMemo(
    () => (questions ? buildPool(questions, filters) : []),
    [questions, filters]
  );

  // En 'falladas' se restringe a las preguntas cuyo último intento fue fallo
  const pool = useMemo(() => {
    if (mode !== "falladas") return basePool;
    const failed = new Set(store.aggregate().failedIds);
    return basePool.filter((q) => failed.has(q.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePool, mode, statVersion]);

  // Orden: estudio en orden cronológico; examen/falladas barajado (estable hasta "Barajar")
  const orderedPool = useMemo(() => {
    if (mode === "estudio") return pool;
    return shuffle(pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, mode, orderKey]);

  function onResult(_id: string, correct: boolean) {
    store.record(_id, correct ? "correct" : "wrong");
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
        <Scoreboard agg={agg} streak={streak} onReset={resetProgress} />
      </header>

      {questions && (
        <Controls
          mode={mode}
          setMode={setMode}
          filters={filters}
          setFilters={setFilters}
          years={years}
          poolCount={orderedPool.length}
        />
      )}

      {questions && orderedPool.length > 0 && mode !== "estudio" && (
        <div class="toolbar">
          <span class="toolbar__hint">Responde cada pregunta; se corrige al instante.</span>
          <button class="btn btn--ghost btn--small" onClick={() => setOrderKey((k) => k + 1)}>
            ⇄ Barajar
          </button>
        </div>
      )}

      <main class="stage">
        {loadError && (
          <p class="notice">No se pudieron cargar las preguntas. Recarga la página.</p>
        )}
        {!loadError && !questions && <p class="notice">Cargando preguntas…</p>}

        {questions && orderedPool.length === 0 && (
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

        {questions && orderedPool.length > 0 && (
          <div class="list" key={filterKey}>
            {orderedPool.map((q, i) => (
              <QuestionItem key={q.id} question={q} mode={mode} index={i} onResult={onResult} />
            ))}
          </div>
        )}
      </main>

      <footer class="foot">
        <span>
          {questions?.length ?? 0} preguntas de convocatorias reales · datos abiertos
        </span>
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
