# Exámenes taxi Granada

Recopilación de exámenes de aptitud para la obtención del permiso municipal de
conductor/a de auto-taxi en el Área de Prestación Conjunta de Granada.

## Convención de nombres

Cada archivo sigue el esquema:

```
AAAA-MM-DD_taxi-granada_<tipo>.pdf
```

- La fecha es la del **examen** (extraída del contenido del documento). Cuando no
  consta el día exacto se usa `AAAA-MM` (por norma no se celebra más de un examen
  al mes).
- `<tipo>` indica el contenido del documento:

| Tipo | Contenido |
|------|-----------|
| `examen` | Solo las preguntas. |
| `examen-resuelto` | Preguntas + respuestas (plantilla correctora / hoja de respuestas). |
| `plantilla` | Solo la hoja de respuestas, sin las preguntas. |
| `resultados` | Listado de resultados de la convocatoria. |

## Utilidades

- `check_duplicates.py` — comprueba que no haya PDFs con contenido duplicado
  (compara el texto visible, ignorando el nombre de archivo; los PDF escaneados se
  comparan como imagen). Ejecutar con `python3 check_duplicates.py`.
- `rename_map.txt` — mapeo de los nombres originales a los actuales.
