import type { Mode, Option, OptionKey, Question } from "../types";
import { SECTION_LABEL, displayYears } from "../types";

const LETTER: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "D" };

export function QuestionCard({
  question,
  options,
  mode,
  chosen,
  revealed,
  index,
  onChoose,
}: {
  question: Question;
  options: Option[];
  mode: Mode;
  chosen: OptionKey | null;
  revealed: boolean;
  index?: number;
  onChoose: (key: OptionKey) => void;
}) {
  const study = mode === "estudio";
  const locked = revealed || study;
  const answered = revealed && !study;
  const correct = chosen === question.correctOption;
  const ys = displayYears(question);

  return (
    <article class={`card${answered ? (correct ? " card--ok" : " card--no") : ""}`}>
      <header class="card__meta">
        <span class="card__meta-left">
          {index != null && <span class="card__num">{index + 1}</span>}
          <span class="tag">{SECTION_LABEL[question.section]}</span>
        </span>
        <span class="card__src" title={question.dates.join(" · ")}>
          {ys.length > 1 ? `Convocatorias ${ys.join(" · ")}` : `Convocatoria ${question.dates[0]}`}
        </span>
      </header>

      {answered && (
        <div class={`cardroof cardroof--${correct ? "ok" : "no"}`} role="status">
          <span class="roof__dot" aria-hidden="true" />
          {correct ? "LIBRE · acierto" : "OCUPADO · fallo"}
          <span class="roof__dot" aria-hidden="true" />
        </div>
      )}

      <h2 class="card__statement">{question.statement}</h2>

      <ul class="opts">
        {options.map((opt, i) => {
          const isCorrect = opt.key === question.correctOption;
          const isChosen = opt.key === chosen;
          let cls = "opt";
          if (locked) {
            if (isCorrect) cls += " opt--correct";
            else if (isChosen) cls += " opt--wrong";
            else cls += " opt--dim";
          }
          return (
            <li key={opt.key}>
              <button
                class={cls}
                onClick={() => !locked && onChoose(opt.key)}
                disabled={locked}
                aria-pressed={isChosen}
              >
                <span class="opt__letter" aria-hidden="true">
                  {LETTER[i]}
                </span>
                <span class="opt__text">{opt.text}</span>
                {locked && isCorrect && (
                  <span class="opt__mark opt__mark--ok" aria-label="Correcta">
                    ✓
                  </span>
                )}
                {revealed && isChosen && !isCorrect && (
                  <span class="opt__mark opt__mark--no" aria-label="Tu respuesta">
                    ✕
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {locked && question.explanation && (
        <p class="card__why">
          <span class="card__why-tag">Por qué</span>
          {question.explanation}
        </p>
      )}
    </article>
  );
}
