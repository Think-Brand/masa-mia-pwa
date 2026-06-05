import { createClient } from "./supabase";

export type Settings = {
  pickup_address_line1: string;
  pickup_address_line2: string;
  pickup_address_city: string;
  pickup_address_zip: string;
  pickup_address_full: string;
  pickup_maps_url: string;
  pickup_hours_note: string;
  contact_alex_name: string;
  contact_alex_wa: string;
  contact_fabiola_name: string;
  contact_fabiola_wa: string;
  /** Meta de ventas mensual en MXN (string para conservar el patrón key-value).
   *  Mario la edita desde /staff/ajustes → Negocio. Default 8000 para
   *  emprendimientos arrancando — bajo a propósito, motiva sin desanimar. */
  monthly_sales_goal_mxn: string;
  /** Modo vacaciones: bloquea fechas en un rango con mensaje custom.
   *  Se apaga solo cuando vacation_to ya pasó (lógica en RPC is_vacation_day). */
  vacation_active: "on" | "off";
  vacation_from: string; // YYYY-MM-DD o ""
  vacation_to: string;   // YYYY-MM-DD o ""
  vacation_message: string;
};

const DEFAULTS: Settings = {
  pickup_address_line1: "",
  pickup_address_line2: "",
  pickup_address_city: "",
  pickup_address_zip: "",
  pickup_address_full: "",
  pickup_maps_url: "",
  pickup_hours_note: "",
  contact_alex_name: "Alex",
  contact_alex_wa: "",
  contact_fabiola_name: "Fabiola",
  contact_fabiola_wa: "",
  monthly_sales_goal_mxn: "8000",
  vacation_active: "off",
  vacation_from: "",
  vacation_to: "",
  vacation_message: "Estamos descansando un ratito 🥐 Volvemos pronto.",
};

/** Helper: lee la meta del mes como número, con fallback al default. */
export function getMonthlyGoal(s: Settings): number {
  const parsed = Number(s.monthly_sales_goal_mxn);
  if (!Number.isFinite(parsed) || parsed <= 0) return 8000;
  return parsed;
}

let cached: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cached) return cached;
  const supabase = createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const merged: Settings = { ...DEFAULTS };
  for (const row of data ?? []) {
    (merged as any)[row.key] = row.value;
  }
  cached = merged;
  return merged;
}
