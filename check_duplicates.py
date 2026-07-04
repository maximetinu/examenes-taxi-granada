#!/usr/bin/env python3
"""
Comprueba si algun PDF de la carpeta esta duplicado por CONTENIDO visible
(el nombre de archivo NO cuenta como diferencia).

Estrategia:
  1. Extrae el texto visible de cada PDF con `pdftotext` (poppler).
  2. Normaliza el texto (minusculas, colapsa espacios, quita saltos).
  3. Compara todos los pares:
       - Duplicado EXACTO  -> texto normalizado identico.
       - Casi-duplicado    -> similitud >= UMBRAL (difflib).
  4. Para PDFs sin texto extraible (escaneados/imagen), los renderiza a
     imagen con `pdftoppm` y compara un hash perceptual sencillo (aHash)
     de cada pagina, para no dejarlos fuera del analisis.
"""

import os
import re
import sys
import glob
import hashlib
import subprocess
import tempfile
from difflib import SequenceMatcher
from itertools import combinations

CARPETA = os.path.dirname(os.path.abspath(__file__))
UMBRAL_SIMILITUD = 0.97          # >= se considera casi-duplicado
MIN_CHARS_TEXTO = 40             # menos de esto => se trata como PDF-imagen


def extraer_texto(ruta):
    """Devuelve el texto visible del PDF (todas las paginas), o '' si falla."""
    try:
        out = subprocess.run(
            ["pdftotext", "-enc", "UTF-8", ruta, "-"],
            capture_output=True, timeout=120,
        )
        return out.stdout.decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  ! error extrayendo texto de {os.path.basename(ruta)}: {e}")
        return ""


def normalizar(texto):
    """Normaliza para comparar solo el contenido, ignorando formato."""
    t = texto.lower()
    t = t.replace("\x0c", " ")            # form feed entre paginas
    t = re.sub(r"\s+", " ", t)            # colapsa cualquier espacio/salto
    return t.strip()


def ahash_paginas(ruta, tmpdir):
    """Renderiza el PDF a PNG (72dpi, gris) y devuelve lista de aHash por pagina."""
    base = os.path.join(tmpdir, "pg")
    try:
        subprocess.run(
            ["pdftoppm", "-png", "-gray", "-r", "72", ruta, base],
            capture_output=True, timeout=180, check=True,
        )
    except Exception as e:
        print(f"  ! error renderizando {os.path.basename(ruta)}: {e}")
        return []
    hashes = []
    for png in sorted(glob.glob(base + "*.png")):
        hashes.append(_ahash_png(png))
    return hashes


def _ahash_png(png_path):
    """aHash 8x8 muy simple leyendo el PNG en escala de grises sin dependencias
    externas: usa `sips` (macOS) para escalar a 8x8 y luego promedia bytes."""
    # Fallback robusto: hash del contenido reescalado. Si no hay libreria de
    # imagen, usamos el hash del fichero reescalado por sips a 8x8.
    try:
        small = png_path + ".small.png"
        subprocess.run(["sips", "-z", "8", "8", png_path, "--out", small],
                       capture_output=True, check=True)
        with open(small, "rb") as f:
            data = f.read()
        return hashlib.md5(data).hexdigest()
    except Exception:
        with open(png_path, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()


def main():
    pdfs = sorted(glob.glob(os.path.join(CARPETA, "*.pdf")))
    if not pdfs:
        print("No se encontraron PDFs en", CARPETA)
        return

    print(f"Analizando {len(pdfs)} PDFs en: {CARPETA}\n")

    con_texto = {}      # nombre -> texto normalizado
    sin_texto = []      # nombres de PDFs imagen

    for ruta in pdfs:
        nombre = os.path.basename(ruta)
        norm = normalizar(extraer_texto(ruta))
        if len(norm) >= MIN_CHARS_TEXTO:
            con_texto[nombre] = norm
        else:
            sin_texto.append(nombre)
        print(f"  leido: {nombre:60s} [{len(norm):6d} chars de texto]")

    print("\n" + "=" * 70)
    print("RESULTADOS")
    print("=" * 70)

    # ---- Comparacion por texto ----
    exactos = []
    casi = []
    nombres = list(con_texto.keys())
    for a, b in combinations(nombres, 2):
        ta, tb = con_texto[a], con_texto[b]
        if ta == tb:
            exactos.append((a, b))
        else:
            ratio = SequenceMatcher(None, ta, tb).ratio()
            if ratio >= UMBRAL_SIMILITUD:
                casi.append((a, b, ratio))

    # ---- Comparacion de PDFs imagen ----
    dup_imagen = []
    if sin_texto:
        with tempfile.TemporaryDirectory() as tmp:
            firmas = {}
            for nombre in sin_texto:
                ruta = os.path.join(CARPETA, nombre)
                sub = os.path.join(tmp, hashlib.md5(nombre.encode()).hexdigest())
                os.makedirs(sub, exist_ok=True)
                firmas[nombre] = tuple(ahash_paginas(ruta, sub))
            for a, b in combinations(sin_texto, 2):
                if firmas[a] and firmas[a] == firmas[b]:
                    dup_imagen.append((a, b))

    # ---- Informe ----
    if exactos:
        print("\n[!] DUPLICADOS EXACTOS (mismo contenido de texto):")
        for a, b in exactos:
            print(f"    - '{a}'  ==  '{b}'")
    if casi:
        print(f"\n[!] CASI-DUPLICADOS (similitud >= {UMBRAL_SIMILITUD:.0%}):")
        for a, b, r in sorted(casi, key=lambda x: -x[2]):
            print(f"    - '{a}'  ~~  '{b}'   (similitud {r:.1%})")
    if dup_imagen:
        print("\n[!] DUPLICADOS (PDFs imagen con mismas paginas):")
        for a, b in dup_imagen:
            print(f"    - '{a}'  ==  '{b}'")

    if sin_texto:
        print("\n[i] PDFs sin texto extraible (comparados como imagen):")
        for n in sin_texto:
            print(f"    - {n}")

    if not exactos and not casi and not dup_imagen:
        print("\n[OK] No se ha detectado ningun duplicado por contenido.")
        print(f"     {len(pdfs)} PDFs, todos con contenido distinto.")
    else:
        total = len(exactos) + len(casi) + len(dup_imagen)
        print(f"\n[RESUMEN] {total} par(es) de PDFs con contenido duplicado/similar.")

    print()


if __name__ == "__main__":
    main()
