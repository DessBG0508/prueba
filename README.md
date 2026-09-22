# Equilibra TESH: Tu Bienestar

Actúa como Frontend Engineer senior experto en React, TypeScript, Tailwind CSS,
shadcn/ui, Lucide Icons y Framer Motion. Construye la interfaz web responsive
(mobile-first) de "Equilibra TESH", plataforma de apoyo psicológico universitario
del TESH Huixquilucan. Toda la UI en español de México, tono empático y calmado.

## STACK Y ARQUITECTURA

- React + Vite + TypeScript + Tailwind + shadcn/ui + lucide-react + framer-motion.
- Estructura limpia desde el inicio:
  /src
  /components/ui (botones, chips, cards, inputs reutilizables)
  /components/layout (AppHeader, BottomNav, PageShell)
  /components/effects (AuroraBackground, LiquidButton, BlobCursor)
  /features/home, /features/checkin, /features/alerta
  /lib (utils, tokens, mock-data.ts, api-client.ts)
- Datos 100% mock con flag DEMO_MODE para conectar Supabase después sin romper la UI.
- Tipos TypeScript: Mood, CheckIn, RiskLevel, CrisisResource.

## DESIGN SYSTEM (tokens exactos en Tailwind)

- primary #1B198F (Azul profundo): títulos en texto, botones sólidos, CTA de crisis
- accent #6857E4 (Lila): botón primario, chips activos, escala
- secondary #C3B3F1 (Lavanda): hover y decorativos
- teal #12BDB6, cyan #00BCC8: gradientes y gráficas
- alert #FF9CED: EXCLUSIVO de alertas/crisis (nunca decorativo)
- Fondos: #DFF7F2, #F1EDFC, #87FFBD muy suaves; cards blancas con sombra difusa etérea
- Radios grandes (rounded-2xl/3xl), estética calmada y etérea
  Tipografía:
- Títulos: "Milesdane" (self-hosted en /public/fonts con @font-face),
  fallback "Playfair Display". Uso: logo, headings, frases destacadas.
- Cuerpo/UI/botones: "Montserrat" 400/500/600/700.

## PANTALLAS

### 1. Home Estudiante "/"

- Header: logo "Equilibra", campana, avatar.
- "Hola, Dess ✨" + subtítulo: "Qué bueno verte por aquí. Siempre es un buen
  momento para cuidar de ti."
- Card de estado de ánimo: "¿Cómo te sientes hoy?" con 5 círculos de color
  (Muy bien, Bien, Regular, Triste, Muy mal) + iconos lucide; spring al seleccionar.
- Grid 2x2 de accesos rápidos: Check-in emocional (2 min), Ejercicios de
  respiración, Recursos, Mis citas.
- Botón principal full-width "Agendar cita con psicólogo" (#6857E4, efecto líquido).
- "Tu bienestar en números" (mock): Ánimo 3.8/5, Sueño 6.5h, Estrés 2.4/5, Energía 3.6/5.
- BottomNav: Inicio, Recursos, botón + central elevado, Citas, Perfil.

### 2. Check-in Emocional "/checkin"

- Flecha atrás + título serif "Check-in emocional" + "Semana del 15 al 19 de septiembre".
- Card: "¿Qué tan cargada sentiste esta semana académica?" con escala 1–5 en
  píldoras circulares (la seleccionada se llena de lila con animación elástica).
- Chips multi-seleccionables (fondo menta al activar): Tranquila, Estrés leve,
  Buen sueño, Ansiedad, Insomnio, Ánimo bajo.
- "Guardar check-in": overlay de éxito con check animado + mensaje empático.
  En DEMO_MODE, si escala = 4 o 5 → redirigir a /alerta (simula regla de triaje RD02).
- Botón outline secundario: "Hablar con un psicólogo".

### 3. Alerta Prioritaria — Nivel Rojo "/alerta"

- Etiqueta "ATENCIÓN PRIORITARIA".
- Banner grande #FF9CED rounded-3xl: título serif "Notamos que podrías necesitar
  apoyo ahora" + "No estás sola/o en esto. Hay alguien disponible para escucharte
  en este momento, sin costo y de forma confidencial."
- Botón sólido #1B198F: "Hablar con alguien ahora".
- Botón blanco: "Ver recursos de apoyo".
- Card "Mientras tanto": respiración 4-7-8 con círculo animado que crece/decrece.
  "Respira lento cuatro segundos, sostén, y suelta. Estamos aquí contigo."
- Recursos clicables: Línea de la Vida 800 911 2000, Emergencias 911, chat con Eli.
- Tono SIEMPRE calmado, jamás alarmista.

## EFECTOS (premium pero sobrio)

- AuroraBackground: gradientes lentos lavanda→menta→cyan con blur y grano sutil.
- LiquidButton: en hover un gradiente radial líquido sigue el cursor dentro del
  botón (estilo "What can I build" de reactbits.dev).
- BlobCursor: blob suave que sigue el cursor con lerp, SOLO desktop
  (pointer: fine) y respetando prefers-reduced-motion.
- Cards con hover lift + sombra creciente; transiciones de ruta con fade/slide.

## PREPARADO PARA SEGURIDAD (fase Supabase)

- Login/Registro stub (email + placeholder Google OAuth) y ProtectedRoute que
  valide rol: estudiante, psicologo, coordinador, admin (tabla profiles).
- NADA sensible en localStorage; nada de API keys en el cliente.
- /lib/api-client.ts con funciones mock documentadas (saveCheckIn, triggerRedAlert)
  listas para reemplazar por Supabase.
- Comentarios en español marcando dónde irán las políticas RLS por rol.

Empieza implementando: design system + Home completa. Luego espera mi
confirmación para el Check-in, y después la Alerta.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b45662d9-52ac-4b25-8047-eed754c958fb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
