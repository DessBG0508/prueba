/**
 * Integración con Resend SMTP / REST API para PB-021 Encuesta de Satisfacción
 * Equilibra TESH - Notificaciones Institucionales
 *
 * NOTA ARQUITECTÓNICA (MIN-008):
 * - Se prefiere Resend sobre Supabase SMTP debido al límite de 2 correos por hora de Supabase.
 * - Resend en su plan gratuito ofrece hasta 100 correos por día (3,000/mes), suficiente para
 *   el flujo de altas y abandonos de la comunidad TESH.
 */

export interface EnviarEncuestaEmailParams {
  destinatarioEmail: string;
  destinatarioNombre?: string;
  folio: string;
  triggerTipo: "alta" | "abandono";
  enlaceEncuesta: string;
}

export interface EnviarEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  modo: "resend_api" | "simulado_local";
}

/**
 * Plantilla HTML con estilos institucionales Equilibra TESH (#6857E4, #1C2474, #0BB5B5)
 */
function generarCuerpoHtml(params: EnviarEncuestaEmailParams): string {
  const esAlta = params.triggerTipo === "alta";
  const nombre = params.destinatarioNombre || `Estudiante (${params.folio})`;

  const tituloBanner = esAlta
    ? "Felicidades por concluir tu proceso de atención"
    : "Tu bienestar sigue siendo nuestra prioridad";

  const mensajePrincipal = esAlta
    ? "Has completado exitosamente tus sesiones de acompañamiento psicológico en el Tecnológico de Estudios Superiores de Huixquilucan. Tu experiencia nos ayuda a seguir elevando la calidad del servicio."
    : "Hemos notado que no pudiste acudir a tus últimas citas programadas. Queremos conocer si existieron barreras de horario, traslado o académicas, y ofrecerte alternativas para retomar tu bienestar cuando estés listo/a.";

  const badgeTrigger = esAlta ? "Alta de Proceso Clínico" : "Seguimiento por Inasistencia";

  const plazoTexto = esAlta
    ? "El enlace estará disponible para responderse en las próximas 24 horas."
    : "Cuentas con una ventana de 15 días naturales para contestar este formulario.";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Equilibra TESH - Encuesta PB-021</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6fd; margin: 0; padding: 24px; color: #1c2474;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(104, 87, 228, 0.08); border: 1px solid #e5e1fc;">
    <tr>
      <td style="background: linear-gradient(135deg, #1c2474 0%, #6857e4 100%); padding: 32px 28px; text-align: center;">
        <span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
          PB-021 · Calidad y Satisfacción
        </span>
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; line-height: 1.3;">
          ${tituloBanner}
        </h1>
        <p style="color: #d8d2ff; font-size: 13px; margin: 8px 0 0 0;">
          Tecnológico de Estudios Superiores de Huixquilucan (TESH)
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">
          Hola, ${nombre}
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
          ${mensajePrincipal}
        </p>
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #fdfcff; border: 1px solid #d8d2ff; border-radius: 14px; padding: 14px; margin-bottom: 24px;">
          <tr>
            <td style="font-size: 12px; color: #64748b; line-height: 1.5;">
              <strong style="color: #1c2474;">Folio del caso:</strong> ${params.folio}<br/>
              <strong style="color: #1c2474;">Motivo de envío:</strong> ${badgeTrigger}<br/>
              <strong style="color: #6857e4;">Plazo de respuesta:</strong> ${plazoTexto}
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${params.enlaceEncuesta}" style="display: inline-block; background: #6857e4; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 14px rgba(104, 87, 228, 0.35);">
            Completar Encuesta PB-021 (2 minutos) &rarr;
          </a>
        </div>

        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 24px 0 0 0; border-top: 1px solid #f1f0fb; pt: 16px;">
          <strong>Nota institucional (MIN-008):</strong> Esta encuesta está identificada con tu folio de tamizaje para permitir mejoras personalizadas en el servicio del departamento de psicología. No se emitirán diagnósticos a partir de este formulario.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #faf9ff; padding: 20px; text-align: center; border-top: 1px solid #e5e1fc; font-size: 11px; color: #94a3b8;">
        Equilibra TESH · Área de Orientación y Apoyo Psicológico<br/>
        Enviado a través de Resend SMTP (Cuota 100 correos/día)
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Envía la notificación de la encuesta mediante Resend API
 */
export async function enviarNotificacionEncuestaResend(
  params: EnviarEncuestaEmailParams,
): Promise<EnviarEmailResult> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;

  const html = generarCuerpoHtml(params);
  const asunto =
    params.triggerTipo === "alta"
      ? `[Equilibra TESH] Encuesta de Satisfacción PB-021 - Folio ${params.folio}`
      : `[Equilibra TESH] Tu bienestar nos importa: Encuesta breve - Folio ${params.folio}`;

  // Si no hay API key de Resend configurada en el cliente, registrar y operar con modo simulado
  if (!apiKey || apiKey === "tu_resend_api_key_aqui" || !apiKey.startsWith("re_")) {
    console.warn(
      `[Resend SMTP] VITE_RESEND_API_KEY no detectada. Notificación registrada en modo local para: ${params.destinatarioEmail} (Folio: ${params.folio}, Tipo: ${params.triggerTipo}).`,
    );
    return {
      ok: true,
      messageId: `sim-resend-${Date.now()}`,
      modo: "simulado_local",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Equilibra TESH <citas@equilibra-tesh.edu.mx>",
        to: [params.destinatarioEmail],
        subject: asunto,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Resend API Error]:", response.status, errText);
      return {
        ok: false,
        error: `Error al enviar correo vía Resend (${response.status}): ${errText}`,
        modo: "resend_api",
      };
    }

    const data = await response.json();
    return {
      ok: true,
      messageId: data.id,
      modo: "resend_api",
    };
  } catch (error) {
    console.error("[Resend Exception]:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado de red al contactar Resend",
      modo: "resend_api",
    };
  }
}
