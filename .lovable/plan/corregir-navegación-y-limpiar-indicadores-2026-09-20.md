# Corregir navegación y limpiar indicadores

## Cambios

- Conectar el acceso “Check-in emocional” de la Home con `/checkin` mediante navegación interna.
- Mostrar un aviso discreto “Próximamente” en los otros tres accesos rápidos y en el botón central “+”.
- Montar el sistema de avisos una sola vez para que funcione en toda la aplicación.
- Mantener las cuatro métricas como tarjetas propias con número y barra; no añadir ni conservar componentes o dependencias de terceros con licencias restrictivas.

## Validación

- Comprobar los cinco clics solicitados, la navegación a `/checkin`, los avisos y la ausencia de errores.
- Confirmar mediante búsqueda que no existan marcas de agua en el código ni en las dependencias, y que `/checkin` no haya sido modificado.
