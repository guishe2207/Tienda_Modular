param(
  [string]$Input = "INFORME_SEGURIDAD.md",
  [string]$Output = "docs/seguridad/Informe_Laboratorio_Seguridad_Tienda_Modular.pdf"
)

# Requiere Pandoc y un motor PDF (por ejemplo MiKTeX), no incluidos en el repositorio.
pandoc $Input --from gfm --pdf-engine=xelatex -V mainfont=Arial -V geometry:margin=2cm -o $Output
