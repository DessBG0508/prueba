import React, { useState } from "react";

export interface RecursoEmergencia {
  id: string;
  nombre: string;
  institucion: string;
  telefono: string;
  telefonoHref: string;
  horario: string;
  descripcion: string;
  tipo: "emergencia" | "crisis" | "institucional";
}

const RECURSOS_EMERGENCIA: RecursoEmergencia[] = [
  {
    id: "911",
    nombre: "911 Emergencias",
    institucion: "Centro de Atención a Llamadas de Emergencia Nacional",
    telefono: "911",
    telefonoHref: "tel:911",
    horario: "24/7 · Todos los días del año",
    descripcion:
      "Atención médica, policial y rescate ante situaciones que ponen en riesgo inminente tu vida o la de alguien más.",
    tipo: "emergencia",
  },
  {
    id: "saptel-general",
    nombre: "SAPTEL (Instituto Nacional de Psiquiatría)",
    institucion: "Sistema de Apoyo Psicológico por Teléfono",
    telefono: "55 5259-5589",
    telefonoHref: "tel:5552595589",
    horario: "24/7 · Gratuito y confidencial",
    descripcion:
      "Línea especializada en intervención en crisis emocional, contención psicológica y prevención del suicidio.",
    tipo: "crisis",
  },
  {
    id: "linea-vida-072",
    nombre: "Línea de la Vida al 072 (SAPTEL)",
    institucion: "Secretaría de Salud / Red Nacional SAPTEL",
    telefono: "072",
    telefonoHref: "tel:072",
    horario: "24/7 · Gratuito",
    descripcion:
      "Orientación inmediata y contención ante angustia severa, depresión aguda o crisis de ansiedad.",
    tipo: "crisis",
  },
  {
    id: "psicologo-tesh",
    nombre: "Psicólogo TESH",
    institucion: "Tecnológico de Estudios Superiores de Huixquilucan",
    telefono: "Ext. Psicología / psicologia@tesh.edu.mx",
    telefonoHref: "mailto:psicologia@tesh.edu.mx",
    horario: "Lunes a Viernes de 8:00 a 18:00 hrs (Horario escolar)",
    descripcion:
      "Atención y acompañamiento presencial para la comunidad estudiantil. Edificio de Tutorías y Desarrollo Estudiantil.",
    tipo: "institucional",
  },
];

export default function CrisisPage() {
  const [telefonoSeleccionado, setTelefonoSeleccionado] = useState<string | null>(null);

  const handleLlamadaRapida = () => {
    // Redirigir de inmediato al 911 en dispositivos móviles
    window.location.href = "tel:911";
  };

  return (
    <main
      role="main"
      aria-label="Página de recursos de emergencia y contención en crisis"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:py-10 flex items-center justify-center font-sans"
    >
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Tarjeta Principal de Alerta */}
        <section
          aria-labelledby="titulo-crisis"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-xl overflow-hidden"
        >
          {/* Encabezado con franja de alerta visual */}
          <div className="bg-red-600 dark:bg-red-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold"
                aria-hidden="true"
              >
                !
              </span>
              <div>
                <h1
                  id="titulo-crisis"
                  className="text-xl sm:text-2xl font-extrabold tracking-tight"
                >
                  Atención Inmediata
                </h1>
                <p className="text-red-100 text-xs sm:text-sm font-medium">
                  Espacio seguro de auxilio para estudiantes del TESH
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Aviso Legal y Clínico Crítico (RD-04) */}
            <div
              role="alert"
              aria-live="polite"
              className="rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900/70 p-4 text-center sm:text-left"
            >
              <p className="text-red-900 dark:text-red-200 text-sm sm:text-base font-bold leading-snug">
                Si estás en riesgo inmediato, llama directamente. Equilibra TESH no es un servicio
                de emergencia.
              </p>
              <p className="text-red-700 dark:text-red-300 text-xs mt-1.5 leading-relaxed">
                Esta plataforma ofrece tamizaje y acompañamiento, pero no cuenta con vigilancia
                médica ni intervención 24/7 en sitio.
              </p>
            </div>

            {/* BOTÓN ESTÁTICO GRANDE SIEMPRE VISIBLE */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLlamadaRapida}
                aria-label="Necesito ayuda ahora. Llamar inmediatamente al servicio de emergencias 911"
                className="w-full group relative flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg sm:text-xl py-5 px-6 rounded-2xl shadow-lg shadow-red-600/30 transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-white text-base font-bold"
                  aria-hidden="true"
                >
                  &#9742;
                </span>
                <span>Necesito ayuda ahora</span>
              </button>
              <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">
                Al pulsar este botón tu teléfono marcará el 911 de forma inmediata.
              </p>
            </div>

            {/* Directorio Oficial de Recursos Telefónicos */}
            <div className="space-y-3 pt-2">
              <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base uppercase tracking-wider">
                Líneas directas oficiales y gratuitas
              </h2>

              <ul className="space-y-3" role="list">
                {RECURSOS_EMERGENCIA.map((recurso) => {
                  const esEmergenciaPura = recurso.tipo === "emergencia";
                  const esInstitucional = recurso.tipo === "institucional";

                  return (
                    <li
                      key={recurso.id}
                      className={`rounded-2xl border transition-colors p-4 ${
                        esEmergenciaPura
                          ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                          : esInstitucional
                            ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                              {recurso.nombre}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                esEmergenciaPura
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : esInstitucional
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                              }`}
                            >
                              {recurso.horario}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {recurso.institucion}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
                            {recurso.descripcion}
                          </p>
                        </div>

                        {/* Botón de llamada telefónica directa */}
                        <div className="pt-2 sm:pt-0 shrink-0">
                          <a
                            href={recurso.telefonoHref}
                            onClick={() => setTelefonoSeleccionado(recurso.telefono)}
                            aria-label={`Llamar a ${recurso.nombre} al ${recurso.telefono}`}
                            className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                              esEmergenciaPura
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500"
                                : esInstitucional
                                  ? "bg-[#1B198F] hover:bg-[#1B198F]/90 text-white shadow-sm focus-visible:ring-[#1B198F]"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus-visible:ring-emerald-500"
                            }`}
                          >
                            <span aria-hidden="true">&#9742;</span>
                            <span>{recurso.telefono}</span>
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Confirmación accesible tras seleccionar un recurso */}
            {telefonoSeleccionado && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium"
              >
                Conectando con {telefonoSeleccionado}...
              </p>
            )}

            {/* Protocolo de Contención Inmediata */}
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-4 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Pasos mientras te comunicas:
              </span>
              <ul className="list-disc list-inside space-y-1">
                <li>No te quedes a solas; acércate a una persona de confianza o compañero.</li>
                <li>Inhala profundo contando hasta 4, retén 4 segundos y exhala en 4 segundos.</li>
                <li>
                  Si estás dentro del campus TESH, acude a la enfermería o coordinación de carrera.
                </li>
              </ul>
            </div>

            {/* Botón para volver al chat o espacio universitario */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => window.history.back()}
                aria-label="Regresar a la pantalla anterior de la plataforma"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg px-2 py-1"
              >
                ← Volver a la plataforma
              </button>
            </div>
          </div>
        </section>

        {/* Pie de página institucional */}
        <footer className="text-center text-xs text-slate-400 dark:text-slate-500">
          <p>Equilibra TESH · Tecnológico de Estudios Superiores de Huixquilucan</p>
          <p className="mt-0.5 text-[11px]">
            Privacidad garantizada: no se almacena ningún dato de las consultas de emergencia.
          </p>
        </footer>
      </div>
    </main>
  );
}
