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
 * - Incrementa el contador atómicamente
 *
 * Usa RPC `apply_welcome_courtesy` (SECURITY DEFINER + FOR UPDATE) que:
 * - Salta el RLS de settings (anon no podía updatearlo → el contador
 *   se quedaba en 0 aunque los clientes sí se marcaran).
 * - Bloquea la fila durante la transacción → sin race conditions
 *   aunque caigan pedidos simultáneos.
 * - Re-valida el cupo dentro del lock → nunca se regalan más del tope.
 * - Es idempotente: si el cliente ya recibió, devuelve success=false
 *   sin incrementar de nuevo.
 *
 * Retorna { success, count, max, reason? }
 */
export async function applyWelcomeCourtesy(customerId: string): Promise<{
  success: boolean;
  count: number;
  max?: number;
  reason?: "already_received" | "no_cupos";
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("apply_welcome_courtesy", {
    p_customer_id: customerId,
  });

  if (error) {
    console.error("apply_welcome_courtesy RPC failed:", error);
    return { success: false, count: 0, reason: "no_cupos" };
  }

  return data as {
    success: boolean;
    count: number;
    max?: number;
    reason?: "already_received" | "no_cupos";
  };
}
