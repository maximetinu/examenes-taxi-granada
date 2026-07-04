import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// base = nombre del repo, para que las rutas funcionen en GitHub Pages.
// viteSingleFile incrusta JS y CSS dentro de index.html (un solo fichero),
// evitando depender de /assets/*.js — que GitHub Pages sirve de forma poco
// fiable en este repo. questions.json se sigue cargando aparte (raíz, sí sirve).
export default defineConfig({
  base: "/examenes-taxi-granada/",
  plugins: [preact(), viteSingleFile()],
});
