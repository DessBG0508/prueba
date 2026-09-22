# Correcciones de Alerta y Dashboard del Psicólogo

## Parte A — `/alerta`

- Mantener el círculo de respiración en un ciclo continuo 4–7–8: crecer 4 s, sostener 7 s y contraerse 8 s; dejarlo estático cuando el sistema prefiera menos movimiento.
- Añadir al final una salida discreta con el mensaje indicado y enlace a `/`.
- Ajustar el token `alert` al rosa exacto `#FF9CED`, conservándolo exclusivamente en esta pantalla.

## Parte B — BottomNav

- Calcular el estado activo con la ruta actual.
- Resaltar “Inicio” únicamente cuando la ruta sea exactamente `/`; en `/checkin`, `/alerta` y `/psicologo` no habrá pestaña activa.

## Parte C — `/psicologo`

- Crear una pantalla móvil primero con cabecera propia para el panel, avatar de psicólogo y campana decorativa.
- Añadir tres filtros semaforizados con selección reversible y una lista ordenada por nivel de riesgo.
- Incorporar 8 casos anónimos en los datos mock: 2 de riesgo alto, 3 de seguimiento y 3 estables, tipados con `CaseSummary` y el comentario de futura consulta solicitado.
- Mostrar cada caso con iniciales, nivel, resumen, fecha y acción “Ver resumen”.
- Abrir un panel de detalle accesible “Modo Acompañamiento” con resumen, PHQ-9, GAD-7, nota de tamizaje y acción demo “Agendar sesión”.
- Añadir metadatos propios de la ruta.

## Validación

- Mantener Home y `/checkin` sin cambios.
- Comprobar `/alerta` y `/psicologo` en móvil y escritorio, filtros, panel, enlaces, animación, consola y compilación.
