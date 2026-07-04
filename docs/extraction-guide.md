# Guía de extracción de un examen → JSON

Tu tarea: leer UN documento de examen de taxi de Granada y producir UN archivo
JSON válido en `data/exams/<id>.json`. Sigue esta guía al pie de la letra: el
JSON se validará después contra `schema/exam.ts` (Zod) y debe cumplir el esquema
EXACTAMENTE (campos estrictos, sin campos extra).

## Forma del JSON

Para `docType` `examen` o `examen-resuelto`:

```json
{
  "id": "2020-09-29",
  "sourceFile": "2020-09-29_taxi-granada_examen-resuelto.pdf",
  "date": "2020-09-29",
  "datePrecision": "day",
  "convocatoria": "septiembre 2020",
  "organo": "Ayuntamiento de Granada",
  "notes": null,
  "docType": "examen-resuelto",
  "sections": [
    {
      "kind": "general",
      "title": "Cuestionario general",
      "questions": [
        {
          "id": "2020-09-29-general-1",
          "number": 1,
          "statement": "Según el artículo 2 ...",
          "options": [
            { "key": "a", "text": "Vehículo ... cinco plazas ..." },
            { "key": "b", "text": "Vehículo ... nueve plazas ..." },
            { "key": "c", "text": "Vehículo ... silla de ruedas ..." }
          ],
          "correctOption": "b",
          "explanation": null,
          "image": null
        }
      ]
    }
  ]
}
```

Para `docType` `plantilla` (solo rejilla de respuestas, sin enunciados):

```json
{
  "id": "...", "sourceFile": "...", "date": "...", "datePrecision": "...",
  "convocatoria": null, "organo": null, "notes": null,
  "docType": "plantilla",
  "answerKey": [
    { "section": "general", "number": 1, "correct": "b" }
  ]
}
```

Para `docType` `resultados`:

```json
{
  "id": "...", "sourceFile": "...", "date": "...", "datePrecision": "...",
  "convocatoria": "...", "organo": "...", "notes": null,
  "docType": "resultados",
  "summary": "Resultado de la convocatoria de noviembre 2023: N personas aptas."
}
```

## Reglas de los campos

- **id**: normalmente la fecha (`YYYY-MM-DD`, o `YYYY-MM` si solo se conoce el mes).
  Te lo indica el orquestador; úsalo tal cual.
- **sourceFile**: el nombre del PDF de origen (te lo indica el orquestador).
- **date / datePrecision**: `date` = `YYYY-MM-DD` con `datePrecision:"day"` si conoces
  el día; si solo el mes, `date` = `YYYY-MM` y `datePrecision:"month"`. Saca la
  fecha del CONTENIDO del documento (cabecera), no del nombre.
- **convocatoria**: texto libre corto si aparece (p. ej. "junio 2024"), si no `null`.
- **organo**: el órgano emisor de la cabecera, o `null`.
- **notes**: anomalías, dudas, avisos de OCR, respuestas no emparejadas… o `null`.

## Secciones

- `CUESTIONARIO GENERAL` o `PRUEBA EN MATERIAS GENERALES` → `kind: "general"`.
- `CUESTIONARIO DE INGLÉS` / `CUESTIONARIO INGLES` → `kind: "ingles"`.
- `PREGUNTAS DE RESERVA` → `kind: "reserva"`.
- Incluye solo las secciones que existan en el documento, en su orden.

## Preguntas y opciones

- `number`: el número tal cual en el documento (reinicia en cada sección).
- `statement`: enunciado completo, sin el número. Corrige errores EVIDENTES de OCR
  (p. ej. "1l" → "11", "Cadiz" → "Cádiz") sin cambiar el significado. No inventes.
- `options`: una por opción, con `key` = `a`|`b`|`c`|`d` y `text` fiel.
- Une texto partido en varias líneas en un solo string.

## Respuesta correcta (`correctOption`)

- **Documento con texto y PLANTILLA CORRECTORA al final** (rejilla número→letra por
  sección): parsea esa rejilla y asigna la letra correcta a cada pregunta. La rejilla
  suele salir desordenada en columnas del OCR: reconstrúyela con cuidado.
- **Documento escaneado (imágenes)**: la respuesta correcta está en **NEGRITA** en la
  página. Mírala en las imágenes y pon esa letra. Si una opción negrita no es clara,
  pon `correctOption: null` y anótalo en `notes`.
- **Examen en blanco (sin respuestas)**: `correctOption: null` en todas.
- REGLA DE ORO: no inventes respuestas. Ante la duda, `null` + nota.
- `correctOption` debe coincidir con la `key` de una opción presente.

## explanation / image

- `explanation`: si el documento da una justificación de la respuesta, ponla; si no,
  `null`.
- `image`: `null` salvo que la pregunta dependa de una imagen/mapa embebido; en ese
  caso pon una breve descripción como valor y anótalo en `notes`.

## resultados: PRIVACIDAD

El documento de resultados lista aspirantes con nombres y DNI. **NO transcribas datos
personales.** Solo un `summary` neutro con convocatoria, fecha y, si aparece, número
de aptos/presentados.

## Salida

Escribe SOLO el archivo `data/exams/<id>.json` con JSON válido (UTF-8, sin comentarios).
No ejecutes validación. Al terminar, responde con un resumen de 3-5 líneas: docType,
nº de preguntas por sección, cuántas con respuesta, y cualquier anomalía.
```
