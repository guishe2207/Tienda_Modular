"""Genera el PDF final del laboratorio con evidencias locales reales."""
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/seguridad/Informe_Laboratorio_Seguridad_Tienda_Modular.pdf'
EVIDENCE = ROOT / 'docs/seguridad/evidencias'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Cover', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=23, leading=28, alignment=TA_CENTER, textColor=colors.black))
styles.add(ParagraphStyle(name='Heading', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, leading=18, spaceBefore=10, spaceAfter=7))
styles.add(ParagraphStyle(name='BodySmall', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=11))
styles.add(ParagraphStyle(name='Cell', parent=styles['BodyText'], fontName='Helvetica', fontSize=7.2, leading=8.6))

def p(text, style='BodyText'):
    return Paragraph(text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), styles[style])

def table(rows, widths=None):
    data = [[p(cell, 'Cell') for cell in row] for row in rows]
    item = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    item.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8e8e8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.35, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return item

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.drawString(2 * cm, 1.1 * cm, 'Tienda Modular — Laboratorio de Seguridad Express')
    canvas.drawRightString(A4[0] - 2 * cm, 1.1 * cm, f'Página {doc.page}')
    canvas.restoreState()

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.8*cm)
    story = [Spacer(1, 4*cm), p('INFORME FINAL', 'Cover'), Spacer(1, .4*cm), p('Laboratorio de Seguridad Express', 'Cover'), Spacer(1, .8*cm), p('Proyecto: Tienda Modular', 'Heading'), p('Fecha: 29 de octubre de 2026<br/>Rama: seguridad<br/>Entorno probado: PostgreSQL local aislado, HTTPS localhost y Angular local<br/>Producción de referencia: https://tienda-modular-frontend.onrender.com/', 'BodyText'), Spacer(1, 1*cm), p('Integrantes: no se identificaron nombres verificables en la documentación del repositorio; no se inventaron datos.', 'BodySmall'), PageBreak()]
    story += [p('Objetivo y metodología', 'Heading'), p('Se auditó el código Express/Angular, configuración, SQL y dependencias. Las pruebas de escritura se realizaron únicamente contra el contenedor local tienda-modular-postgres publicado en 127.0.0.1:5433. Se instaló una CA local con mkcert, se levantó HTTPS en 3443 y se utilizó Chrome headless para la evidencia visual. Render no fue modificado ni recibió pruebas de escritura.', 'BodyText')]
    story += [p('Diagnóstico y correcciones', 'Heading'), table([
        ['Hallazgo', 'OWASP', 'Corrección y verificación'],
        ['Bearer en sessionStorage', 'A07', 'JWT firmado en cookie HttpOnly/Secure/SameSite=Strict; login 200, JWT vencido 401 y sexto fallo 429.'],
        ['Falta de roles/IDOR', 'A01', 'Roles backend, registro sólo cliente y pedido asociado al usuario; cliente ajeno recibió 404.'],
        ['HTTPS local parcial', 'A02/A04', 'mkcert, TLS 3443, redirección HTTP 308 y HSTS max-age=300 verificados.'],
        ['CSRF basado en Bearer', 'A05/A07', 'Doble envío tm_csrf/X-CSRF-Token: 403 sin token y 201 con token.'],
        ['Riesgo XSS', 'A05', 'Sin APIs HTML inseguras; Angular mostró las cargas como texto escapado.'],
    ], [4.0*cm, 2.0*cm, 10.0*cm])]
    story += [p('Resultados de integración HTTPS local', 'Heading')]
    checks = json.loads((EVIDENCE / '06-pruebas-http-local.json').read_text(encoding='utf-8'))['resultados']
    rows = [['Prueba', 'Esperado', 'Obtenido', 'Resultado']] + [[x['prueba'], str(x['esperado']), str(x['obtenido']), x['resultado']] for x in checks]
    story.append(table(rows, [9.5*cm, 2.2*cm, 2.2*cm, 2.2*cm]))
    story += [Spacer(1, .35*cm), p('Resultado: 19/19 verificaciones aprobadas. No se incluyeron tokens, cookies ni contraseñas en el PDF.', 'BodySmall'), PageBreak()]
    story += [p('Evidencia visual XSS y catálogo', 'Heading'), p('La siguiente captura fue tomada con Chrome headless sobre Angular local. La inspección de DOM confirmó que la carga de prueba aparece como &lt;img ... onerror&gt; y &lt;script&gt; codificada, no como elementos ejecutables.', 'BodyText')]
    image_path = EVIDENCE / '07-catalogo-xss-escape.png'
    if image_path.exists():
        image = Image(str(image_path)); image._restrictSize(17.5*cm, 14*cm); story += [Spacer(1, .3*cm), image]
    story += [p('Cabeceras comprobadas', 'Heading'), p('CSP con default-src self, X-Content-Type-Options: nosniff y Strict-Transport-Security: max-age=300; includeSubDomains. La cadena TLS fue validada por Node con la CA local de mkcert.', 'BodyText')]
    story += [p('OWASP, riesgos y mejora continua', 'Heading'), table([
        ['Categoría', 'Resultado'],
        ['A01', 'Roles, 401/403 y control IDOR 404 verificados.'], ['A02', 'CORS restringido, cabeceras y HTTPS local.'],
        ['A03', 'npm audit de producción: 0 vulnerabilidades.'], ['A04', 'scrypt con sal, JWT firmado y TLS local.'],
        ['A05', 'SQL parametrizado, CSRF y escape Angular/XSS probado.'], ['A06', 'Cantidad negativa rechazada y precio obtenido desde PostgreSQL.'],
        ['A07-A10', 'Autenticación, integridad, registro seguro de errores y validación central aplicados.'],
    ], [2.5*cm, 13.5*cm])]
    story += [p('Matriz de riesgos', 'Heading'), table([
        ['Riesgo', 'Prob.', 'Impacto', 'Tratamiento'],
        ['Filtración de PostgreSQL', 'Media', 'Alto', 'Mitigar: rotación, mínimo privilegio y red restringida.'],
        ['Fuerza bruta distribuida', 'Media', 'Medio', 'Mitigar: rate limit distribuido y alertas futuras.'],
        ['XSS futuro', 'Baja', 'Alto', 'Mitigar: CSP, revisión y pruebas automatizadas.'],
        ['Pedidos de invitado', 'Media', 'Medio', 'Aceptar temporalmente; asociar cuenta en evolución futura.'],
        ['Dependencias', 'Media', 'Alto', 'Mitigar: audit y actualización coordinada en CI.'],
    ], [6*cm, 2*cm, 2*cm, 6*cm])]
    story += [p('Respuesta a incidentes y datos personales', 'Heading'), p('NIST: preparación (inventario y backups), detección (alertas y logs), contención (revocar credenciales), erradicación (rotar y eliminar filtración), recuperación (validar TLS/accesos) y lecciones aprendidas (causa raíz y controles). La aplicación trata nombre, correo, teléfono, dirección, ciudad/departamento, observaciones y pedidos; se recomienda minimización, finalidad explícita, retención definida, control de acceso y atención de derechos Ley 1581 de 2012. No se declara cumplimiento legal completo.', 'BodyText')]
    story += [p('Conclusiones y referencias', 'Heading'), p('El hallazgo principal fue el token administrativo accesible desde JavaScript. La cookie HttpOnly, el JWT de vida corta, CSRF, roles y pruebas locales reducen materialmente ese riesgo. Próximos pasos: MFA administrativa, rotación de token, logs centralizados y CI de seguridad.', 'BodyText'), p('Referencias: Guía_Laboratorio_Seguridad_Express.pdf; OWASP Top 10; Ley 1581 de 2012; evidencias del repositorio docs/seguridad/evidencias.', 'BodySmall')]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)

if __name__ == '__main__':
    main()
