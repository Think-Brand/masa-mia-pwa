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
};

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
