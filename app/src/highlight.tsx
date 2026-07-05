import type { ComponentChildren } from "preact";

// Pliega cada carácter (minúscula, sin acentos) manteniendo un mapa de la posición
// plegada -> posición original, para poder resaltar el TEXTO ORIGINAL a partir de
// coincidencias encontradas en la versión normalizada (insensible a acentos).
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = text[i]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    for (let j = 0; j < f.length; j++) {
      folded += f[j];
      map.push(i);
    }
  }
  map.push(text.length); // centinela para el final
  return { folded, map };
}

/**
 * Devuelve el texto troceado con <mark class="hl"> alrededor de las coincidencias
 * de `words` (ya normalizadas). Si no hay palabras o coincidencias, devuelve el texto.
 */
export function highlightMatches(text: string, words: string[]): ComponentChildren {
  if (!words || words.length === 0) return text;

  const { folded, map } = foldWithMap(text);
  const ranges: Array<[number, number]> = [];
  for (const w of words) {
    if (!w) continue;
    let from = 0;
    let idx = folded.indexOf(w, from);
    while (idx !== -1) {
      ranges.push([map[idx], map[idx + w.length]]);
      from = idx + w.length;
      idx = folded.indexOf(w, from);
    }
  }
  if (ranges.length === 0) return text;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const out: ComponentChildren[] = [];
  let pos = 0;
  merged.forEach(([s, e], k) => {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(
      <mark class="hl" key={k}>
        {text.slice(s, e)}
      </mark>
    );
    pos = e;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}
