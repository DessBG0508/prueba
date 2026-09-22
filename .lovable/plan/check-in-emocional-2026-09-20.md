# Check-in emocional

## Alcance

- Integrar el logotipo correcto y la fuente Milesdane proporcionados.
- Crear la pantalla `/checkin` con encabezado de regreso, escala académica, emociones seleccionables y acciones.
- Guardar el check-in mediante los servicios demo existentes y mostrar confirmación antes de regresar al inicio.
- Aplicar la regla demo de triaje para valores 4–5 con un aviso calmado, sin enlazar todavía a una pantalla inexistente.
- Mantener la Home sin cambios funcionales ni de contenido.

## Detalles técnicos

- Reutilizar `PageShell`, `Button`, tokens visuales, tipos `CheckIn` y funciones de `api-client`.
- Crear un chip reutilizable para las emociones.
- Registrar Milesdane con `@font-face`, `font-display: swap` y Playfair Display como respaldo.
- Añadir metadatos propios para `/checkin` y validar móvil/escritorio, interacciones y compilación.
