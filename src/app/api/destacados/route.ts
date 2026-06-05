// GET /api/destacados
//
// Devuelve { productOfDay, topSellers, source } para el catálogo.
// - Ranking de best-sellers: suma de order_items.quantity por producto,
//   contando solo pedidos válidos (status NOT IN declined/cancelled) en los
//   últimos 90 días, filtrado a productos públicos y activos.
// - El "Antojo del día" se elige determinísticamente por fecha (zona MX), de
//   modo que es estable durante el día y rota al siguiente sin repetir hasta
//   agotar el pool (top 10).
// - Cacheado en memoria por día MX para no recalcular en cada visita.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Product } from "@/lib/types";
import {
  Destacados,
  mxDayString,
  mxDayIndex,
  pickForDay,
} from "@/lib/destacados";

// El handler corre siempre; el cache por día vive en este short-circuit.
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 90;
const POOL_SIZE = 10;

// Cache de proceso, keyed por día MX. Se invalida solo al cambiar el día.
let cache: { day: string; payload: Destacados } | null = null;

function supa() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function computeDestacados(): Promise<Destacados> {
  const supabase = supa();
  const windowStart = new Date(
    Date.now() - WINDOW_DAYS * 86_400_000
  ).toISOString();

  // Productos vendibles (mapa por id para ordenar/filtrar el ranking).
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const productMap = new Map<string, Product>(
    (products ?? []).map((p) => [p.id, p as Product])
  );

  // Items de pedidos válidos en la ventana. inner join a orders para filtrar
  // por status/fecha del pedido (no del item).
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity, orders!inner(status, created_at)")
    .gte("orders.created_at", windowStart)
    .not("orders.status", "in", '("declined","cancelled")');

  // Suma de cantidades por producto.
  const qtyByProduct = new Map<string, number>();
  for (const row of (items ?? []) as Array<{
    product_id: string;
    quantity: number;
  }>) {
    if (!productMap.has(row.product_id)) continue; // ignora no-públicos/inactivos
    qtyByProduct.set(
      row.product_id,
      (qtyByProduct.get(row.product_id) ?? 0) + (row.quantity ?? 0)
    );
  }

  let pool: Product[];
  let source: Destacados["source"];

  if (qtyByProduct.size > 0) {
    source = "history";
    pool = [...qtyByProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, POOL_SIZE)
      .map(([id]) => productMap.get(id)!)
      .filter(Boolean);
  } else {
    // Fallback sin historial: novedades primero, luego sort_order. Rota igual.
    source = "fallback";
    pool = [...productMap.values()]
      .sort((a, b) => {
        const an = a.is_new ? 0 : 1;
        const bn = b.is_new ? 0 : 1;
        if (an !== bn) return an - bn;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      })
      .slice(0, POOL_SIZE);
  }

  const productOfDay = pickForDay(pool, mxDayIndex());

  return { productOfDay, topSellers: pool, source };
}

export async function GET() {
  const day = mxDayString();
  if (cache && cache.day === day) {
    return NextResponse.json(cache.payload);
  }
  try {
    const payload = await computeDestacados();
    cache = { day, payload };
    return NextResponse.json(payload);
  } catch (err) {
    // Si algo falla, no rompemos el catálogo: respondemos vacío y el cliente
    // simplemente no muestra Hero/carrusel.
    return NextResponse.json(
      { productOfDay: null, topSellers: [], source: "fallback" } as Destacados,
      { status: 200 }
    );
  }
}
