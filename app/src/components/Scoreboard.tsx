import type { Aggregate } from "../store";

// Marcador con estética de taxímetro (dígitos LED).
export function Scoreboard({
  agg,
  streak,
  onReset,
}: {
  agg: Aggregate;
  streak: number;
  onReset: () => void;
}) {
  const pct = Math.round(agg.accuracy * 100);
  return (
    <section class="board" aria-label="Marcador">
      <div class="board__cells">
        <Cell label="Aciertos" value={String(agg.correct)} />
        <Cell label="Precisión" value={agg.correct + agg.wrong ? `${pct}%` : "—"} />
        <Cell label="Racha" value={String(streak)} accent={streak >= 3} />
      </div>
      <button
        class="board__reset"
        onClick={onReset}
        disabled={agg.answered === 0}
        title="Borra tu progreso guardado en este navegador"
      >
        Reiniciar
      </button>
    </section>
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
