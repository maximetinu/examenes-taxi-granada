import { useMemo, useState } from "preact/hooks";
import type { ExamDoc, Mode } from "./types";
import { SECTION_LABEL } from "./types";
import { QuestionItem } from "./components/QuestionItem";
import examsData from "./exams.data.json";

const EXAMS = examsData as unknown as ExamDoc[];

// Pestaña "Exámenes": elegir una convocatoria y hacerla completa en su orden.
export function Exams() {
  const [selId, setSelId] = useState<string | null>(null);
  const exam = useMemo(() => EXAMS.find((e) => e.id === selId) ?? null, [selId]);

  if (!exam) return <ExamList onOpen={setSelId} />;
  return <ExamRunner exam={exam} onBack={() => setSelId(null)} />;
}

function ExamList({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <main class="stage">
      <p class="exams__intro">
        Elige una convocatoria para hacerla completa, en su orden original. En modo examen se puntúa
        como el examen real: cada 4 fallos restan un acierto.
      </p>
      <div class="exam-list">
        {EXAMS.map((e) => (
          <button class="exam-card" key={e.id} onClick={() => onOpen(e.id)}>
            <span class="exam-card__date">{e.date}</span>
            <span class="exam-card__meta">
              {e.total} preguntas ·{" "}
              {e.sections.map((s) => `${SECTION_LABEL[s.kind].toLowerCase()} ${s.questions.length}`).join(" · ")}
            </span>
            <span class="exam-card__go" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div class={`cell${accent ? " cell--hot" : ""}`}>
      <span class="cell__value">{value}</span>
      <span class="cell__label">{label}</span>
    </div>
  );
}

function ExamRunner({ exam, onBack }: { exam: ExamDoc; onBack: () => void }) {
  const [mode, setMode] = useState<"examen" | "estudio">("examen");
  const [attempt, setAttempt] = useState(0);
  const [score, setScore] = useState({ aciertos: 0, fallos: 0 });

  function onResult(_id: string, correct: boolean) {
    setScore((s) => ({
      aciertos: s.aciertos + (correct ? 1 : 0),
      fallos: s.fallos + (correct ? 0 : 1),
    }));
  }
  function reset() {
    setAttempt((a) => a + 1);
    setScore({ aciertos: 0, fallos: 0 });
  }
  function switchMode(m: "examen" | "estudio") {
    setMode(m);
    setAttempt((a) => a + 1);
    setScore({ aciertos: 0, fallos: 0 });
  }

  const answered = score.aciertos + score.fallos;
  const neto = score.aciertos - score.fallos / 4;
  const nota10 = exam.scorable ? Math.max(0, (neto / exam.scorable) * 10) : 0;
  const qmode: Mode = mode === "estudio" ? "estudio" : "quiz";

  return (
    <main class="stage">
      <div class="exam-head">
        <button class="btn btn--ghost btn--small" onClick={onBack}>
          ← Convocatorias
        </button>
        <div class="exam-head__title">
          <strong>Examen {exam.date}</strong>
          {exam.organo && <span class="exam-head__org">{exam.organo}</span>}
        </div>
        <div class="seg seg--mini" role="tablist" aria-label="Modo del examen">
          <button
            role="tab"
            aria-selected={mode === "examen"}
            class={`seg__btn${mode === "examen" ? " is-active" : ""}`}
            onClick={() => switchMode("examen")}
          >
            Examen
          </button>
          <button
            role="tab"
            aria-selected={mode === "estudio"}
            class={`seg__btn${mode === "estudio" ? " is-active" : ""}`}
            onClick={() => switchMode("estudio")}
          >
            Estudio
          </button>
        </div>
      </div>

      {mode === "examen" && (
        <>
          <section class="board exam-score" aria-label="Puntuación del examen">
            <div class="board__cells">
              <Cell label="Aciertos" value={String(score.aciertos)} />
              <Cell label="Fallos" value={String(score.fallos)} />
              <Cell label="Sin contestar" value={String(Math.max(0, exam.scorable - answered))} />
              <Cell label="Nota /10" value={answered ? nota10.toFixed(1) : "—"} accent />
            </div>
            <button class="board__reset" onClick={reset} disabled={answered === 0}>
              Reiniciar
            </button>
          </section>
          <p class="exam-note">
            Cada 4 fallos restan un acierto (penalización de ¼). Puntúan {exam.scorable} preguntas.
          </p>
        </>
      )}

      <div class="list" key={`${mode}-${attempt}`}>
        {exam.sections.map((s) => (
          <section class="exam-sec" key={s.kind}>
            <h3 class="exam-sec__title">{s.title}</h3>
            {s.questions.map((q) => {
              const annulled = q.correctOption === null;
              return (
                <QuestionItem
                  key={q.id}
                  question={q}
                  mode={annulled ? "estudio" : qmode}
                  index={q.number - 1}
                  shuffleOptions={false}
                  onResult={onResult}
                />
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
