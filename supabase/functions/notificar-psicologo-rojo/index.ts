import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_PSICOLOGO_EMAIL = "dra.marta@tesh.mx";
const INSTITUTIONAL_FALLBACK_FROM = "Equilibra TESH Alertas <alertas@equilibra-tesh.edu.mx>";
const RESEND_ONBOARDING_FROM = "Equilibra TESH Alertas <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AlertaRojoPayload {
  folio: string;
  paciente: {
    iniciales: string;
    edad: number;
    sexo: string;
    fecha?: string;
    semestre?: string;
  };
  gad7_total: number;
  gad7_items?: number[];
  phq9_total: number;
  phq9_items?: number[];
  item9_score: number;
  psicologo_id?: string;
  psicologo_email?: string;
  estudiante_id?: string;
  estudiante_email?: string;
  estudiante_nombre?: string;
  fecha?: string;
}

/**
 * Plantilla HTML con estilo clínico institucional para Alertas de Nivel Rojo
 * Paleta canónica Equilibra: Índigo (#1C2474), Morado (#6857E4), Carmesí Alerta (#DC2626)
 */
function generarEmailAlertaRojoHtml(data: AlertaRojoPayload, psicologoNombre?: string): string {
  const item9Critico = data.item9_score > 0;
  const fechaStr = data.fecha || new Date().toISOString();
  const iniciales = data.paciente.iniciales || "Estudiante";
  const edad = data.paciente.edad ? `${data.paciente.edad} años` : "No especificada";
  const sexo = data.paciente.sexo || "No especificado";
  const folio = data.folio || "EQ-SIN-FOLIO";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>ALERTA CLÍNICA INMEDIATA - Nivel Rojo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fef2f2; margin: 0; padding: 24px; color: #1c2474;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(220, 38, 38, 0.12); border: 2px solid #fecaca;">
    
    <!-- Banner de Alerta Roja -->
    <tr>
      <td style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #b91c1c 100%); padding: 32px 28px; text-align: center;">
        <span style="display: inline-block; background: rgba(255,255,255,0.25); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 5px 14px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.4);">
          ⚠️ PROTOCOLO DE URGENCIA CLÍNICA · NIVEL ROJO
        </span>
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; line-height: 1.3;">
          Notificación Activa de Tamizaje de Alto Riesgo
        </h1>
        <p style="color: #fecaca; font-size: 13px; margin: 8px 0 0 0; font-weight: 600;">
          Tecnológico de Estudios Superiores de Huixquilucan (TESH)
        </p>
      </td>
    </tr>

    <!-- Contenido Principal -->
    <tr>
      <td style="padding: 28px 28px 20px 28px;">
        <p style="font-size: 15px; font-weight: 600; color: #1c2474; margin: 0 0 12px 0;">
          Estimado/a ${psicologoNombre || "Profesional del Área de Psicología"},
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 20px 0;">
          Se ha registrado un tamizaje clínico con clasificación de <strong>NIVEL ROJO (Atención Prioritaria)</strong> en la plataforma Equilibra TESH. El estudiante ha completado las evaluaciones PHQ-9 y GAD-7, activando el protocolo institucional de contención inmediata.
        </p>

        <!-- Tarjeta de Datos del Paciente y Folio -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #fff5f5; border: 1px solid #f87171; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
          <tr>
            <td>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 13px; color: #7f1d1d; line-height: 1.7;">
                    <strong style="color: #991b1b;">Folio de Tamizaje:</strong> <span style="font-family: monospace; font-weight: 800; font-size: 16px; background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #fca5a5;">${folio}</span><br/>
                    <strong style="color: #991b1b;">Iniciales:</strong> ${iniciales}<br/>
                    <strong style="color: #991b1b;">Edad / Sexo:</strong> ${edad} · ${sexo}<br/>
                    <strong style="color: #991b1b;">Fecha y Hora:</strong> ${fechaStr}<br/>
                    ${data.estudiante_email ? `<strong style="color: #991b1b;">Correo registrado:</strong> ${data.estudiante_email}<br/>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Resultados Cuantitativos de los Instrumentos -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Depresión (PHQ-9)</span>
              <p style="font-size: 24px; font-weight: 800; color: #991b1b; margin: 4px 0 0 0;">
                ${data.phq9_total} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/ 27 pts</span>
              </p>
              <div style="margin-top: 8px; font-size: 11px; line-height: 1.4;">
                ${
                  item9Critico
                    ? `<span style="background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: 700;">⚠️ Reactivo 9 > 0 (Puntaje: ${data.item9_score})</span><br/><span style="color: #b91c1c; font-weight: 600;">Ideación o autolesión reportada.</span>`
                    : `<span style="color: #b91c1c; font-weight: 600;">Severidad elevada (>=20 pts).</span>`
                }
              </div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; vertical-align: top;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Ansiedad (GAD-7)</span>
              <p style="font-size: 24px; font-weight: 800; color: #991b1b; margin: 4px 0 0 0;">
                ${data.gad7_total} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/ 21 pts</span>
              </p>
              <div style="margin-top: 8px; font-size: 11px; line-height: 1.4; color: #64748b;">
                ${data.gad7_total >= 15 ? "<strong style='color: #b91c1c;'>Ansiedad severa</strong>" : data.gad7_total >= 10 ? "Ansiedad moderada" : "Ansiedad leve"}
              </div>
            </td>
          </tr>
        </table>

        <!-- Protocolo Institucional y Acciones -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px; margin-bottom: 24px;">
          <tr>
            <td style="font-size: 12px; color: #713f12; line-height: 1.6;">
              <strong>Acción institucional tomada por el asistente Eli:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                <li>Se presentó en pantalla la recomendación urgente de Línea de la Vida (800 911 2000 / SAPTEL).</li>
                <li>Se exhortó al estudiante a acudir hoy mismo a la Agenda de Citas seleccionando TERAPIA PSICOLÓGICA.</li>
                <li>Se vincularon sus respuestas a su folio confidencial <strong>${folio}</strong>.</li>
              </ul>
            </td>
          </tr>
        </table>

        <!-- Botón de Acción para el Psicólogo -->
        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="https://equilibra-tesh.edu.mx/expedientes" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 30px; border-radius: 12px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);">
            Abrir Expediente y Contactar al Alumno &rarr;
          </a>
        </div>
      </td>
    </tr>

    <!-- Pie Institucional -->
    <tr>
      <td style="background: #fafaf9; padding: 18px; text-align: center; border-top: 1px solid #f5f5f4; font-size: 11px; color: #78716c;">
        Equilibra TESH · Sistema Automatizado de Alertas de Salud Mental Estudiantil<br/>
        Notificación generada conforme a la NOM-024-SSA3-2012 y lineamientos de confidencialidad clínica.
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido. Solo se acepta POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // =========================================================================
  // 4. VALIDACIÓN DE JWT (Supabase Auth)
  // =========================================================================
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Cabecera Authorization faltante. Se requiere token Bearer." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Variables de entorno de Supabase no configuradas en el servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Usuario no autenticado o sesión expirada." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // =========================================================================
  // 3. OBTENCIÓN DE RESEND_API_KEY (exclusiva de Supabase Secrets)
  // =========================================================================
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey || !resendApiKey.startsWith("re_")) {
    console.error("[AlertaRojo] RESEND_API_KEY no configurada o inválida en secrets.");
    return new Response(
      JSON.stringify({
        error: "RESEND_API_KEY no configurada en los secretos de Supabase.",
        status: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // =========================================================================
  // LECTURA Y VALIDACIÓN DEL BODY
  // =========================================================================
  let payload: AlertaRojoPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Cuerpo de solicitud JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!payload.folio) {
    return new Response(JSON.stringify({ error: "El campo 'folio' es obligatorio." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // =========================================================================
  // 2. DETERMINAR PSICÓLOGO DESTINATARIO
  // =========================================================================
  let psicologoEmail = payload.psicologo_email?.trim();
  let psicologoNombre = "Dra. Marta Gómez";

  // Si no se proporcionó email explícito, consultar psicólogo asignado o coordinador en profiles/psicologos
  if (!psicologoEmail) {
    try {
      if (payload.psicologo_id) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("email, nombre")
          .eq("id", payload.psicologo_id)
          .maybeSingle();
        if (ps?.email) {
          psicologoEmail = ps.email;
          if (ps.nombre) psicologoNombre = ps.nombre;
        }
      }

      if (!psicologoEmail) {
        // Buscar cualquier psicólogo clínico registrado
        const { data: psList } = await supabase
          .from("profiles")
          .select("email, nombre")
          .eq("role", "psicologo")
          .limit(1)
          .maybeSingle();

        if (psList?.email) {
          psicologoEmail = psList.email;
          if (psList.nombre) psicologoNombre = psList.nombre;
        }
      }
    } catch (e) {
      console.warn("[AlertaRojo] Aviso al resolver psicólogo en BD:", e);
    }
  }

  // Fallback institucional si no se pudo resolver de la base de datos
  if (!psicologoEmail) {
    psicologoEmail = DEFAULT_PSICOLOGO_EMAIL;
  }

  // =========================================================================
  // 1 & 2. ENVÍO DE EMAIL MEDIANTE RESEND API
  // =========================================================================
  const html = generarEmailAlertaRojoHtml(payload, psicologoNombre);
  const subject = `[ALERTA CLÍNICA ROJA] Tamizaje de Alto Riesgo - Folio ${payload.folio} (TESH)`;

  let resendMessageId: string | null = null;
  let senderUsed = INSTITUTIONAL_FALLBACK_FROM;

  try {
    // Intento 1: Dominio institucional
    let res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderUsed,
        to: [psicologoEmail],
        subject,
        html,
      }),
    });

    // Si Resend rechaza por dominio no verificado (común en cuentas gratuitas), reintentar con onboarding@resend.dev
    if (!res.ok) {
      const errText = await res.text();
      console.warn(
        `[AlertaRojo] Resend rechazó remitente ${senderUsed}: ${errText}. Reintentando con ${RESEND_ONBOARDING_FROM}...`,
      );

      senderUsed = RESEND_ONBOARDING_FROM;
      res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderUsed,
          to: [psicologoEmail],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const finalErr = await res.text();
        throw new Error(`Error en Resend API (${res.status}): ${finalErr}`);
      }
    }

    const resJson = await res.json();
    resendMessageId = resJson?.id ?? `msg-${Date.now()}`;
  } catch (emailErr: unknown) {
    const errorMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error("[AlertaRojo] Error al enviar email vía Resend:", errorMsg);
    return new Response(
      JSON.stringify({
        error: "No se pudo enviar el correo de alerta al psicólogo a través de Resend.",
        detalle: errorMsg,
        status: "error",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // =========================================================================
  // REGISTRO AUDITORÍA EN BD (Opcional, en tabla alertas_clinicas si existe)
  // =========================================================================
  try {
    await supabase.from("alertas_clinicas").insert({
      folio: payload.folio,
      user_id: user.id,
      nivel: "rojo",
      psicologo_email: psicologoEmail,
      resend_message_id: resendMessageId,
      item9_score: payload.item9_score,
      phq9_total: payload.phq9_total,
      gad7_total: payload.gad7_total,
      enviado_en: new Date().toISOString(),
    });
  } catch {
    // Si la tabla no existe o tiene otra estructura, continuar sin bloquear la respuesta
  }

  return new Response(
    JSON.stringify({
      status: "enviado",
      mensaje: `Alerta clínica enviada exitosamente a ${psicologoEmail}`,
      folio: payload.folio,
      psicologo_email: psicologoEmail,
      message_id: resendMessageId,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
