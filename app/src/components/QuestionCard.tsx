import type { Mode, Option, OptionKey, Question } from "../types";
import { SECTION_LABEL, displayYears } from "../types";

const LETTER: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "D" };

export function QuestionCard({
  question,
  options,
  mode,
  chosen,
  revealed,
  onChoose,
}: {
  question: Question;
  options: Option[];
  mode: Mode;
  chosen: OptionKey | null;
  revealed: boolean;
  onChoose: (key: OptionKey) => void;
}) {
  const locked = revealed || mode === "estudio";
  return (
    <article class="card">
      <header class="card__meta">
        <span class="tag">{SECTION_LABEL[question.section]}</span>
        <span class="card__src" title={question.dates.join(" · ")}>
          {(() => {
            const ys = displayYears(question);
            return ys.length > 1
              ? `Convocatorias ${ys.join(" · ")}`
              : `Convocatoria ${question.dates[0]}`;
          })()}
        </span>
      </header>

      <h2 class="card__statement">{question.statement}</h2>

      <ul class="opts">
        {options.map((opt, i) => {
          const isCorrect = opt.key === question.correctOption;
          const isChosen = opt.key === chosen;
          let cls = "opt";
          if (revealed || mode === "estudio") {
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
                {(revealed || mode === "estudio") && isCorrect && (
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

      {(revealed || mode === "estudio") && question.explanation && (
        <p class="card__why">
          <span class="card__why-tag">Por qué</span>
          {question.explanation}
        </p>
      )}
    </article>
  );
}
