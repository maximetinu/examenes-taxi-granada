import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// base = nombre del repo, para que las rutas de assets funcionen en GitHub Pages
export default defineConfig({
  base: "/examenes-taxi-granada/",
  plugins: [preact()],
});
