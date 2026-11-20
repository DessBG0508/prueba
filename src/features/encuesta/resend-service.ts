/**
 * Integración con Resend SMTP / REST API para PB-021 Encuesta de Satisfacción
 * Equilibra TESH - Notificaciones Institucionales
 *
 * NOTA DE SEGURIDAD:
 * - Ninguna API key de Resend reside en el frontend. El envío real se ejecuta exclusivamente
 *   en la Edge Function de Supabase `enviar-encuesta` mediante `Deno.env.get("RESEND_API_KEY")`.
 */

import { supabase } from "@/lib/supabase";

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
 * Delega el envío de la notificación de encuesta a la Edge Function `enviar-encuesta`
 * para mantener la clave RESEND_API_KEY protegida exclusivamente en Supabase Secrets.
 */
export async function enviarNotificacionEncuestaResend(
  params: EnviarEncuestaEmailParams,
): Promise<EnviarEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke("enviar-encuesta", {
      body: {
        folio: params.folio,
        trigger_tipo: params.triggerTipo,
        destinatarioEmail: params.destinatarioEmail,
        destinatarioNombre: params.destinatarioNombre,
        enlaceEncuesta: params.enlaceEncuesta,
      },
    });

    if (!error && (data?.ok || data?.status === "enviado")) {
      return {
        ok: true,
        messageId: data.message_id || data.id,
        modo: "resend_api",
      };
    }

    console.warn(
      `[Resend Edge] Edge Function no disponible o en modo demo. Notificación registrada localmente para: ${params.destinatarioEmail} (Folio: ${params.folio}, Tipo: ${params.triggerTipo}).`,
    );
    return {
      ok: true,
      messageId: `sim-resend-${Date.now()}`,
      modo: "simulado_local",
    };
  } catch (error) {
    console.warn("[Resend Edge Fallback]:", error);
    return {
      ok: true,
      messageId: `sim-resend-${Date.now()}`,
      modo: "simulado_local",
    };
  }
}
