// Persistencia de estadísticas por pregunta en localStorage. Sin cuentas ni backend.
export type Result = "correct" | "wrong";

export interface QStat {
  seen: number;
  correct: number;
  wrong: number;
  last: Result | null;
}

type StatMap = Record<string, QStat>;

const KEY = "taximetro.stats.v1";

function read(): StatMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StatMap) : {};
  } catch {
    return {};
  }
}

function write(map: StatMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* almacenamiento no disponible: seguimos en memoria */
  }
}

export interface Aggregate {
  answered: number; // preguntas distintas respondidas al menos una vez
  correct: number; // total de aciertos (acumulado)
  wrong: number; // total de fallos (acumulado)
  accuracy: number; // 0..1 sobre intentos totales
  failedIds: string[]; // preguntas cuyo último intento fue fallo
}

export class Store {
  private map: StatMap;

  constructor() {
    this.map = read();
  }

  stat(id: string): QStat {
    return this.map[id] ?? { seen: 0, correct: 0, wrong: 0, last: null };
  }

  record(id: string, result: Result): void {
    const s = this.stat(id);
    this.map[id] = {
      seen: s.seen + 1,
      correct: s.correct + (result === "correct" ? 1 : 0),
      wrong: s.wrong + (result === "wrong" ? 1 : 0),
      last: result,
    };
    write(this.map);
  }

  aggregate(): Aggregate {
    let answered = 0;
    let correct = 0;
    let wrong = 0;
    const failedIds: string[] = [];
    for (const [id, s] of Object.entries(this.map)) {
      if (s.seen > 0) answered++;
      correct += s.correct;
      wrong += s.wrong;
      if (s.last === "wrong") failedIds.push(id);
    }
    const attempts = correct + wrong;
    return { answered, correct, wrong, accuracy: attempts ? correct / attempts : 0, failedIds };
  }

  reset(): void {
    this.map = {};
    write(this.map);
  }
}
