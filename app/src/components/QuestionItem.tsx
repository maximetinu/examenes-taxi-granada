import { useMemo, useState } from "preact/hooks";
import type { Mode, OptionKey, Question } from "../types";
import { shuffledOptions } from "../quiz";
import { QuestionCard } from "./QuestionCard";

// Envoltorio con estado propio por pregunta: cada tarjeta de la lista se responde
// de forma independiente. En modo estudio la respuesta ya sale revelada.
export function QuestionItem({
  question,
  mode,
  index,
  highlight,
  onResult,
}: {
  question: Question;
  mode: Mode;
  index: number;
  highlight?: string[];
  onResult: (id: string, correct: boolean) => void;
}) {
  const study = mode === "estudio";
  const [chosen, setChosen] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(study);
  // Opciones barajadas una sola vez por pregunta (no se re-barajan al re-renderizar)
  const options = useMemo(
    () => (study ? question.options : shuffledOptions(question)),
    [question.id, study]
  );

  function choose(key: OptionKey) {
    if (revealed || study) return;
    setChosen(key);
    setRevealed(true);
    onResult(question.id, key === question.correctOption);
  }

  return (
    <QuestionCard
      question={question}
      options={options}
      mode={mode}
      chosen={chosen}
      revealed={revealed}
      index={index}
      highlight={highlight}
      onChoose={choose}
    />
  );
}
