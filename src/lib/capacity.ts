/**
 * Sistema de capacidad operativa por día/categoría.
 * Lee config de settings.daily_capacity y cuenta items vendidos por fecha de recogida.
 */

import { createClient as createBrowserClient } from "@/lib/supabase";

export type Category = "rol" | "berlinesa" | "rollinbox" | "luvinbox";

export const CATEGORIES: Category[] = [
  "rol",
  "berlinesa",
  "rollinbox",
  "luvinbox",
];

export const CATEGORY_LABEL: Record<Category, string> = {
  rol: "Roles",
  berlinesa: "Berlinesas",
  rollinbox: "RollinBox",
  luvinbox: "LuvinBox",
};

export type Capacity = Partial<Record<Category, number | null>>;

export type OccupancyRow = {
  category: Category;
  used: number;
  limit: number | null;
  percentage: number; // 0-200+ (puede exceder)
  status: "empty" | "ok" | "tight" | "full" | "over" | "unlimited";
};

export type DayOccupancy = {
  date: string; // YYYY-MM-DD
  rows: OccupancyRow[];
  hasAlert: boolean;
  worstStatus: OccupancyRow["status"];
};

/** Trae capacidad configurada (desde settings.daily_capacity) */
export async function getCapacity(supabase: any): Promise<Capacity> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "daily_capacity")
    .maybeSingle();
  if (!data?.value) return {};
  try {
    const parsed =
      typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return parsed as Capacity;
  } catch {
    return {};
  }
}

/** Guarda capacidad nueva */
export async function saveCapacity(
  supabase: any,
  capacity: Capacity
): Promise<void> {
  // Normalizar: omitir nulls y vacíos
  const clean: Capacity = {};
  for (const c of CATEGORIES) {
    const v = capacity[c];
    if (typeof v === "number" && v > 0) {
      clean[c] = v;
    }
  }
  await supabase
    .from("settings")
    .update({ value: JSON.stringify(clean) })
    .eq("key", "daily_capacity");
}

/** Determina el status según porcentaje */
export function statusFromPct(
  used: number,
  limit: number | null
): OccupancyRow["status"] {
  if (limit === null || limit <= 0) return "unlimited";
  if (used === 0) return "empty";
  const pct = (used / limit) * 100;
  if (pct >= 100) return "over";
  if (pct >= 90) return "full";
  if (pct >= 70) return "tight";
  return "ok";
}

/**
 * Cuenta items vendidos por categoría para una fecha de recogida específica.
 * Solo cuenta pedidos activos (no declinados/cancelados).
 */
export async function countItemsForDate(
  supabase: any,
  pickupDate: string
): Promise<Record<Category, number>> {
  const result: Record<Category, number> = {
    rol: 0,
    berlinesa: 0,
    rollinbox: 0,
    luvinbox: 0,
  };

  // 1. Traer order_ids con esa fecha de recogida (activos)
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("pickup_date", pickupDate)
    .neq("status", "declined")
    .neq("status", "cancelled");

  const orderIds = (orders ?? []).map((o: any) => o.id);
  if (orderIds.length === 0) return result;

  // 2. Traer items con su product_id
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .in("order_id", orderIds);

  if (!items || items.length === 0) return result;

  // 3. Traer categorías de esos productos
  const productIds = Array.from(
    new Set(items.map((it: any) => it.product_id).filter(Boolean))
  );
  const { data: prods } = await supabase
    .from("products")
    .select("id, category")
    .in("id", productIds);

  const catByProduct = new Map<string, string>();
  for (const p of prods ?? []) {
    catByProduct.set(p.id, p.category);
  }

  for (const it of items) {
    const cat = catByProduct.get(it.product_id);
    if (cat && (CATEGORIES as string[]).includes(cat)) {
      result[cat as Category] += it.quantity ?? 0;
    }
  }

  return result;
}

/**
 * Calcula ocupación para una fecha.
 */
export async function getDayOccupancy(
  supabase: any,
  pickupDate: string,
  capacity?: Capacity
): Promise<DayOccupancy> {
  const cap = capacity ?? (await getCapacity(supabase));
  const counts = await countItemsForDate(supabase, pickupDate);
  const rows: OccupancyRow[] = CATEGORIES.map((category) => {
    const used = counts[category];
    const limit = cap[category] ?? null;
    const percentage =
      limit && limit > 0 ? Math.round((used / limit) * 100) : 0;
    return {
      category,
      used,
      limit: limit ?? null,
      percentage,
      status: statusFromPct(used, limit ?? null),
    };
  });
  const hasAlert = rows.some(
    (r) => r.status === "full" || r.status === "over" || r.status === "tight"
  );
  const order: OccupancyRow["status"][] = [
    "over",
    "full",
    "tight",
    "ok",
    "empty",
    "unlimited",
  ];
  const worstStatus =
    rows.reduce<OccupancyRow["status"]>(
      (acc, r) =>
        order.indexOf(r.status) < order.indexOf(acc) ? r.status : acc,
      "unlimited"
    );
  return { date: pickupDate, rows, hasAlert, worstStatus };
}

/**
 * Versión optimizada para varios días (1 sola query por tabla).
 */
export async function getMultiDayOccupancy(
  supabase: any,
  pickupDates: string[],
  capacity?: Capacity
): Promise<DayOccupancy[]> {
  if (pickupDates.length === 0) return [];
  const cap = capacity ?? (await getCapacity(supabase));

  // 1. Todos los orders activos en esas fechas
  const { data: orders } = await supabase
    .from("orders")
    .select("id, pickup_date")
    .in("pickup_date", pickupDates)
    .neq("status", "declined")
    .neq("status", "cancelled");

  const orderIdsByDate = new Map<string, string[]>();
  for (const o of orders ?? []) {
    const arr = orderIdsByDate.get(o.pickup_date) ?? [];
    arr.push(o.id);
    orderIdsByDate.set(o.pickup_date, arr);
  }

  const allOrderIds = (orders ?? []).map((o: any) => o.id);
  if (allOrderIds.length === 0) {
    // Ninguna fecha tiene pedidos: devolver vacío
    return pickupDates.map((date) => ({
      date,
      rows: CATEGORIES.map((category) => ({
        category,
        used: 0,
        limit: cap[category] ?? null,
        percentage: 0,
        status: statusFromPct(0, cap[category] ?? null),
      })),
      hasAlert: false,
      worstStatus: "unlimited" as const,
    }));
  }

  // 2. Todos los items
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, product_id, quantity")
    .in("order_id", allOrderIds);

  // 3. Categorías
  const productIds = Array.from(
    new Set((items ?? []).map((it: any) => it.product_id).filter(Boolean))
  );
  const { data: prods } = productIds.length
    ? await supabase
        .from("products")
        .select("id, category")
        .in("id", productIds)
    : { data: [] as any[] };

  const catByProduct = new Map<string, string>();
  for (const p of prods ?? []) {
    catByProduct.set(p.id, p.category);
  }

  // 4. Mapear order_id → pickup_date
  const dateByOrder = new Map<string, string>();
  for (const o of orders ?? []) {
    dateByOrder.set(o.id, o.pickup_date);
  }

  // 5. Acumular por fecha + categoría
  const countsByDate = new Map<string, Record<Category, number>>();
  for (const date of pickupDates) {
    countsByDate.set(date, {
      rol: 0,
      berlinesa: 0,
      rollinbox: 0,
      luvinbox: 0,
    });
  }
  for (const it of items ?? []) {
    const date = dateByOrder.get(it.order_id);
    if (!date) continue;
    const cat = catByProduct.get(it.product_id);
    if (cat && (CATEGORIES as string[]).includes(cat)) {
      const map = countsByDate.get(date);
      if (map) map[cat as Category] += it.quantity ?? 0;
    }
  }

  // 6. Construir DayOccupancy[]
  return pickupDates.map((date) => {
    const counts = countsByDate.get(date) ?? {
      rol: 0,
      berlinesa: 0,
      rollinbox: 0,
      luvinbox: 0,
    };
    const rows: OccupancyRow[] = CATEGORIES.map((category) => {
      const used = counts[category];
      const limit = cap[category] ?? null;
      const percentage =
        limit && limit > 0 ? Math.round((used / limit) * 100) : 0;
      return {
        category,
        used,
        limit: limit ?? null,
        percentage,
        status: statusFromPct(used, limit ?? null),
      };
    });
    const hasAlert = rows.some(
      (r) => r.status === "full" || r.status === "over" || r.status === "tight"
    );
    const order: OccupancyRow["status"][] = [
      "over",
      "full",
      "tight",
      "ok",
      "empty",
      "unlimited",
    ];
    const worstStatus = rows.reduce<OccupancyRow["status"]>(
      (acc, r) =>
        order.indexOf(r.status) < order.indexOf(acc) ? r.status : acc,
      "unlimited"
    );
    return { date, rows, hasAlert, worstStatus };
  });
}

/** Cliente: dado un carrito (items) determina si la fecha puede aceptarlo */
export function canDateAcceptCart(
  occupancy: DayOccupancy,
  cartCounts: Record<Category, number>
): { ok: boolean; blockingCategories: Category[] } {
  const blocking: Category[] = [];
  for (const r of occupancy.rows) {
    if (r.limit === null || r.limit <= 0) continue; // sin límite
    const wouldUse = r.used + (cartCounts[r.category] ?? 0);
    if (wouldUse > r.limit) blocking.push(r.category);
  }
  return { ok: blocking.length === 0, blockingCategories: blocking };
}

/** Colores tailwind por status */
export const STATUS_STYLE: Record<
  OccupancyRow["status"],
  { dot: string; text: string; bar: string; label: string }
> = {
  unlimited: {
    dot: "bg-canela/40",
    text: "text-canela",
    bar: "bg-canela/30",
    label: "Sin límite",
  },
  empty: {
    dot: "bg-verde",
    text: "text-verde",
    bar: "bg-verde",
    label: "Libre",
  },
  ok: {
    dot: "bg-verde",
    text: "text-verde",
    bar: "bg-verde",
    label: "OK",
  },
  tight: {
    dot: "bg-oro",
    text: "text-[#B57A00]",
    bar: "bg-oro",
    label: "Apretado",
  },
  full: {
    dot: "bg-antojo",
    text: "text-antojo",
    bar: "bg-antojo",
    label: "Casi lleno",
  },
  over: {
    dot: "bg-rojo",
    text: "text-rojo",
    bar: "bg-rojo",
    label: "Sobrevendido",
  },
};

/** Re-export del browser client por conveniencia */
export const createClient = createBrowserClient;
