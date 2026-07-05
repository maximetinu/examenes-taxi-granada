import type { Mode, Option, OptionKey, Question } from "../types";
import { SECTION_LABEL } from "../types";
import { highlightMatches } from "../highlight";

const LETTER: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "D" };

export function QuestionCard({
  question,
  options,
  mode,
  chosen,
  revealed,
  index,
  highlight,
  onChoose,
}: {
  question: Question;
  options: Option[];
  mode: Mode;
  chosen: OptionKey | null;
  revealed: boolean;
  index?: number;
  highlight?: string[];
  onChoose: (key: OptionKey) => void;
}) {
  const hl = highlight ?? [];
  const study = mode === "estudio";
  const locked = revealed || study;
  const answered = revealed && !study;
  const correct = chosen === question.correctOption;
  const repeated = question.dates.length > 1;

  return (
    <article class={`card${answered ? (correct ? " card--ok" : " card--no") : ""}`}>
      <header class="card__meta">
        <span class="card__meta-left">
          {index != null && <span class="card__num">{index + 1}</span>}
          <span class="tag">{SECTION_LABEL[question.section]}</span>
        </span>
        <span class={`card__src${repeated ? " card__src--rep" : ""}`}>
          {repeated ? `Ha caído ${question.dates.length} veces` : `Convocatoria ${question.dates[0]}`}
        </span>
      </header>

      {repeated && <p class="card__reps">Convocatorias: {question.dates.join(" · ")}</p>}

      {answered && (
        <div class={`cardroof cardroof--${correct ? "ok" : "no"}`} role="status">
          <span class="roof__dot" aria-hidden="true" />
          {correct ? "LIBRE · acierto" : "OCUPADO · fallo"}
          <span class="roof__dot" aria-hidden="true" />
        </div>
      )}

      <h2 class="card__statement">{highlightMatches(question.statement, hl)}</h2>

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
                <span class="opt__text">{highlightMatches(opt.text, hl)}</span>
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
