# Estado inicial real

Fecha: 2026-10-29 (America/Bogota).

```text
Rama inicial: desarrollo-final
HEAD y origin/main/origin/desarrollo-final: 4ebd1a1
Cambios sin seguimiento preservados: DIAGRAMAS_UML_ACTUALIZADOS/, DIAGRAMAS_UML_FINAL/, docs/Guia_Laboratorio_Seguridad_Express.pdf
```

Se ejecutó `git fetch origin` antes de crear la rama local `seguridad`. No se descartó ningún archivo.

Hallazgo inicial relevante: el login de administración devolvía un token opaco que Angular guardaba en `sessionStorage` y enviaba como Bearer. No satisfacía JWT ni cookie HttpOnly.
