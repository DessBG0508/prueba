# Equilibra TESH — Design system y Home

## Alcance de esta entrega

- Construir únicamente el sistema visual base y la Home del estudiante en `/`.
- Dejar Check-in y Alerta fuera de esta entrega, sin enlaces rotos hacia pantallas aún no construidas.
- Preparar la estructura solicitada para que las siguientes fases se integren sin rehacer la Home.

## Interfaz

- Aplicar la paleta institucional exacta con tokens semánticos: azul profundo, lila, lavanda, teal, cyan y fondos menta/lavanda; reservar rosa exclusivamente para alertas futuras.
- Usar Montserrat para cuerpo e interfaz, y la familia Milesdane con fallback Playfair Display para títulos. Como el archivo de Milesdane no fue adjuntado, la vista usará el fallback hasta recibirlo.
- Integrar el logotipo adjunto en el encabezado y derivar de él el favicon.
- Crear un fondo aurora lento y sobrio, grano sutil, tarjetas blancas etéreas, elevación moderada y cursor blob solo en escritorio, respetando movimiento reducido.

## Home completa

- Encabezado con marca, campana y avatar.
- Bienvenida a Dess y mensaje empático.
- Selector funcional de cinco estados de ánimo con iconos y animación elástica.
- Cuadrícula 2×2 de accesos rápidos: check-in, respiración, recursos y citas.
- Botón principal de agenda con efecto líquido que sigue el cursor.
- Resumen de bienestar con los cuatro indicadores mock solicitados.
- Navegación inferior móvil con botón central elevado; versión de escritorio adaptada sin perder la jerarquía mobile-first.

## Base técnica

- Crear componentes reutilizables de layout, efectos y UI, además del módulo de Home.
- Añadir tipos `Mood`, `CheckIn`, `RiskLevel` y `CrisisResource`, flag `DEMO_MODE`, datos mock y funciones documentadas `saveCheckIn` / `triggerRedAlert`.
- Mantener toda la información en memoria durante esta fase; no guardar datos sensibles ni habilitar servicios externos.
- Añadir metadatos propios de Equilibra TESH para la Home.

## Validación

- Verificar compilación y errores de ejecución.
- Revisar visualmente la Home en escritorio y móvil, incluyendo selección de ánimo, navegación, foco y adaptación del contenido.
