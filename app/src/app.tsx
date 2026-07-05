import { useEffect, useState } from "preact/hooks";
import { Practice } from "./practice";
import { Exams } from "./exams";
import questionsData from "./questions.data.json";

const TOTAL = (questionsData as unknown as unknown[]).length;

type Theme = "auto" | "light" | "dark";
const THEME_CYCLE: Theme[] = ["auto", "light", "dark"];
const THEME_META: Record<Theme, { icon: string; label: string }> = {
  auto: { icon: "◐", label: "Auto" },
  light: { icon: "☀", label: "Claro" },
  dark: { icon: "☾", label: "Oscuro" },
};

type Tab = "practica" | "examenes";

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem("taximetro.theme");
      return t === "light" || t === "dark" ? t : "auto";
    } catch {
      return "auto";
    }
  });
  const [tab, setTab] = useState<Tab>("practica");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("taximetro.theme", theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  function cycleTheme() {
    setTheme((t) => THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length]);
  }

  return (
    <div class="shell">
      <header class="masthead">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true">
            🚕
          </span>
          <div>
            <h1 class="brand__name">Taxímetro</h1>
            <p class="brand__sub">Examen del permiso de auto-taxi · Granada</p>
          </div>
        </div>
        <button
          class="theme-toggle"
          onClick={cycleTheme}
          title="Cambiar tema: auto / claro / oscuro"
          aria-label={`Tema: ${THEME_META[theme].label}. Pulsa para cambiar.`}
        >
          <span class="theme-toggle__icon" aria-hidden="true">
            {THEME_META[theme].icon}
          </span>
          {THEME_META[theme].label}
        </button>
      </header>

      <nav class="tabs" role="tablist" aria-label="Vista">
        <button
          role="tab"
          aria-selected={tab === "practica"}
          class={`tabs__btn${tab === "practica" ? " is-active" : ""}`}
          onClick={() => setTab("practica")}
        >
          Práctica libre
        </button>
        <button
          role="tab"
          aria-selected={tab === "examenes"}
          class={`tabs__btn${tab === "examenes" ? " is-active" : ""}`}
          onClick={() => setTab("examenes")}
        >
          Exámenes
        </button>
      </nav>

      {tab === "practica" ? <Practice /> : <Exams />}

      <footer class="foot">
        <span>{TOTAL} preguntas de convocatorias reales · datos públicos y abiertos</span>
        <a href="https://github.com/maximetinu/examenes-taxi-granada" target="_blank" rel="noreferrer">
          Código y datos
        </a>
      </footer>
    </div>
  );
}
