# Alerta Prioritaria — Nivel Rojo

## Alcance

- Crear `/alerta` con identidad visual calmada, etiqueta prioritaria y banner rosa reservado para crisis.
- Añadir acciones de contacto demo, recursos desplegables tipados y respiración 4-7-8 accesible.
- Conectar el check-in de riesgo rojo para navegar a `/alerta` después de guardar y activar la alerta.
- Aumentar globalmente el espacio inferior de `PageShell` para que la navegación fija nunca cubra contenido.
- Mantener la Home sin cambios.

## Interacción

- “Hablar con alguien ahora” mostrará una confirmación discreta en modo demo.
- “Ver recursos de apoyo” abrirá y cerrará la lista; teléfonos usarán enlaces `tel:` y Chat con Eli quedará sin destino.
- La respiración seguirá un ciclo visual 4–7–8 y se detendrá para personas que prefieren menos movimiento.

## Detalles técnicos

- Nueva ruta con metadatos propios y una pantalla en `features/alerta`.
- Recursos definidos como `CrisisResource[]` y riesgo conectado mediante `RiskLevel`.
- Validación visual en móvil y escritorio, además de compilación y revisión de errores.
