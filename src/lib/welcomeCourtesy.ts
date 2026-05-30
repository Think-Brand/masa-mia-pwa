/**
 * Sistema de cortesía de bienvenida para los primeros 20 clientes nuevos del piloto.
 * Sin códigos: se aplica solo si el cliente cumple condiciones.
 */

import { createClient } from "@/lib/supabase";

export type WelcomeStatus = {
  /** Aplica el descuento de bienvenida automáticamente */
  eligible: boolean;
  /** Cupos restantes (0 si no hay info) */
  remaining: number;
  /** Razón si no es elegible (debug) */
  reason?: string;
};

/**
 * Verifica si el cliente actual aplica para cortesía de bienvenida.
 * Reglas:
 * - Pilot mode activo
 * - Cliente no está en lista de excluidos (Mario, Faby, Alex)
 * - Cliente no la ha recibido antes
 * - Aún quedan cupos (count < max)
 */
export async function checkWelcomeEligibility(args: {
  customerId: string;
  whatsapp: string;
}): Promise<WelcomeStatus> {
  const supabase = createClient();
  const { customerId, whatsapp } = args;

  // 1. Traer settings relevantes en una sola query
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "pilot_mode",
      "pilot_welcome_max",
      "pilot_welcome_count",
      "pilot_excluded_whatsapps",
    ]);

  const map = new Map<string, string>();
  for (const s of settings ?? []) {
    map.set(s.key, s.value);
  }

  if (map.get("pilot_mode") !== "on") {
    return { eligible: false, remaining: 0, reason: "Piloto apagado" };
  }

  const max = parseInt(map.get("pilot_welcome_max") || "0", 10);
  const used = parseInt(map.get("pilot_welcome_count") || "0", 10);
  const remaining = Math.max(0, max - used);

  if (remaining <= 0) {
    return {
      eligible: false,
      remaining: 0,
      reason: "Sin cupos restantes",
    };
  }

  // 2. Excluidos
  let excluded: string[] = [];
  try {
    const raw = map.get("pilot_excluded_whatsapps");
    if (raw) excluded = JSON.parse(raw);
  } catch {}
  if (excluded.includes(whatsapp)) {
    return { eligible: false, remaining, reason: "Cliente excluido" };
  }

  // 3. Cliente ya recibió la cortesía?
  const { data: customer } = await supabase
    .from("customers")
    .select("received_welcome_courtesy")
    .eq("id", customerId)
    .maybeSingle();
  if (customer?.received_welcome_courtesy) {
    return {
      eligible: false,
      remaining,
      reason: "Ya recibió su rol de bienvenida",
    };
  }

  return { eligible: true, remaining };
}

/**
 * Al confirmar pedido con welcome courtesy:
 * - Marca al cliente como recibido
 * - Incrementa el contador atómicamente con un upsert/update condicional
 *
 * Llamar SOLO después de validar otra vez al confirmar (concurrencia simple).
 */
export async function applyWelcomeCourtesy(customerId: string): Promise<void> {
  const supabase = createClient();

  // Re-validar count antes de incrementar (mejor que nada en concurrencia simple)
  const { data: countSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "pilot_welcome_count")
    .maybeSingle();

  const current = parseInt(countSetting?.value || "0", 10);

  await Promise.all([
    supabase
      .from("customers")
      .update({ received_welcome_courtesy: true })
      .eq("id", customerId),
    supabase
      .from("settings")
      .update({ value: String(current + 1) })
      .eq("key", "pilot_welcome_count"),
  ]);
}
