// La firma de la app: la luz de techo del taxi.
// Verde LIBRE = acierto · Rojo OCUPADO = fallo · Ámbar = modo estudio.
export type RoofState = "idle" | "correct" | "wrong" | "study";

const LABEL: Record<RoofState, string> = {
  idle: "LIBRE",
  correct: "LIBRE",
  wrong: "OCUPADO",
  study: "REPASO",
};

export function RoofLight({ state }: { state: RoofState }) {
  return (
    <div class={`roof roof--${state}`} role="status" aria-live="polite">
      <span class="roof__dot" aria-hidden="true" />
      <span class="roof__label">{LABEL[state]}</span>
      <span class="roof__dot" aria-hidden="true" />
    </div>
  );
}
