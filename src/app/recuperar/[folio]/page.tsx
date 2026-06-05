"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconCheck,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";
import {
  dateToIsoDay,
  formatDateShort,
  formatDeliveryDate,
  getMinPickupDate,
  listAvailableDates,
} from "@/lib/delivery";
import {
  canDateAcceptCart,
  getCapacity,
  getMultiDayOccupancy,
  type Category,
  type DayOccupancy,
} from "@/lib/capacity";

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type Order = {
  id: string;
  folio: string;
  status: string;
  total: number;
  pickup_date: string | null;
  decline_reason: string | null;
  decline_message: string | null;
  contact_person: "alex" | "fabiola" | null;
  customer_id: string | null;
  items: OrderItem[];
  product_categories: Record<string, string>; // product_id → category
};

export default function RecuperarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-canela text-sm">
          Buscando tu antojo…
        </div>
      }
    >
      <Recuperar />
    </Suspense>
  );
}

function Recuperar() {
  const params = useParams<{ folio: string }>();
  const router = useRouter();
  const { cliente } = useCarrito();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Lista de fechas a mostrar
  const minDate = getMinPickupDate(1);
  const fechaList = listAvailableDates(minDate, 14);
  const [pickupDate, setPickupDate] = useState<string>(dateToIsoDay(minDate));
  const [occupancyMap, setOccupancyMap] = useState<Map<string, DayOccupancy>>(
    new Map()
  );

  // Cargar pedido
  useEffect(() => {
    if (!params.folio) return;
    (async () => {
      const supabase = createClient();
      const { data: ord } = await supabase
        .from("orders")
        .select(
          "id, folio, status, total, pickup_date, decline_reason, decline_message, contact_person, customer_id"
        )
        .eq("folio", params.folio)
        .maybeSingle();
      if (!ord) {
        setLoading(false);
        return;
      }
      const { data: items } = await supabase
        .from("order_items")
        .select("id, product_id, product_name, quantity, unit_price")
        .eq("order_id", ord.id);

      const productIds = Array.from(
        new Set((items ?? []).map((it: any) => it.product_id).filter(Boolean))
      );
      const { data: prods } = productIds.length
        ? await supabase
            .from("products")
            .select("id, category")
            .in("id", productIds)
        : { data: [] as any[] };

      const product_categories: Record<string, string> = {};
      for (const p of (prods ?? []) as any[]) {
        product_categories[p.id] = p.category;
      }

      setOrder({
        ...(ord as any),
        items: (items ?? []) as OrderItem[],
        product_categories,
      });
      setLoading(false);
    })();
  }, [params.folio]);

  // Conteo del carrito por categoría
  const cartCounts: Record<Category, number> = useMemo(() => {
    const counts: Record<Category, number> = {
      rol: 0,
      berlinesa: 0,
      rollinbox: 0,
      luvinbox: 0,
    };
    if (!order) return counts;
    for (const it of order.items) {
      const cat = order.product_categories[it.product_id] as Category;
      if (cat && cat in counts) {
        counts[cat] += it.quantity;
      }
    }
    return counts;
  }, [order]);

  // Cargar ocupación
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const capacity = await getCapacity(supabase);
      const hasAnyLimit = Object.values(capacity).some(
        (v) => typeof v === "number" && v > 0
      );
      if (!hasAnyLimit) {
        if (!cancelled) setOccupancyMap(new Map());
        return;
      }
      const dates = fechaList.map((d) => dateToIsoDay(d));
      const occupancies = await getMultiDayOccupancy(
        supabase,
        dates,
        capacity
      );
      if (cancelled) return;
      const map = new Map<string, DayOccupancy>();
      for (const occ of occupancies) map.set(occ.date, occ);
      setOccupancyMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [fechaList.length]);

  const reagendar = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      // Re-validar capacidad
      const occ = occupancyMap.get(pickupDate);
      if (occ) {
        const check = canDateAcceptCart(occ, cartCounts);
        if (!check.ok) {
          setError(
            `Esa fecha ya está llena para ${check.blockingCategories.join(", ")}. Escoge otra.`
          );
          setSaving(false);
          return;
        }
      }
      // Cambiar status a pending + nueva fecha + limpiar decline + marcar acknowledged
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "pending",
          pickup_date: pickupDate,
          decline_reason: null,
          decline_message: null,
          customer_acknowledged_decline: true,
          accepted_at: null,
        })
        .eq("id", order.id);
      if (updErr) throw updErr;
      setDone(true);
      setTimeout(() => router.push(`/confirmacion/${order.folio}`), 1800);
    } catch (e: any) {
      console.error(e);
      setError("Algo se atascó. Intenta otra vez.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-canela text-sm">
        Cargando…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4 max-w-md mx-auto">
        <Miga pose="sentada" animation="sway" size={130} />
        <p className="text-canela text-sm">
          No encontramos ese pedido. <br />
          <span className="text-caramelo">A lo mejor Miga se distrajo.</span>
        </p>
        <Link
          href="/catalogo"
          className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold"
        >
          Volver al menú
        </Link>
      </div>
    );
  }

  if (order.status !== "declined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4 max-w-md mx-auto">
        <Miga pose="lista" animation="jump" size={130} />
        <p className="text-canela text-sm">
          Este pedido ya está activo.
          <br />
          <span className="text-caramelo">Estado: {order.status}</span>
        </p>
        <Link
          href={`/confirmacion/${order.folio}`}
          className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold"
        >
          Ver mi pedido
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
        <Miga pose="lista" animation="jump" size={150} priority />
        <h1
          className="text-3xl text-cafe leading-none mt-4"
          style={{ fontFamily: "ReginaBlack" }}
        >
          ¡Reagendado!
        </h1>
        <p className="text-canela text-sm mt-3 max-w-xs">
          Tu antojo se movió. Ya le avisamos a{" "}
          <b className="text-cafe">nuestros cocineros</b> para que lo confirmen
          🤎
        </p>
      </main>
    );
  }

  const motivoFinal =
    order.decline_message ||
    order.decline_reason ||
    "No fue posible esta vez.";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-10">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center justify-between px-4 py-3">
        <Link href="/mis-pedidos" aria-label="Atrás" className="text-cafe">
          <IconArrowLeft size={20} />
        </Link>
        <h1
          className="text-2xl text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Recuperar
        </h1>
        <div className="w-5" />
      </header>

      <div className="flex-1 px-4 pt-4 flex flex-col gap-3">
        {/* Header con Miga */}
        <div className="text-center">
          <Miga pose="senalar" animation="bounce" size={110} />
          <p className="text-xs text-canela mt-2 italic">
            Cambia la fecha y tu antojo vuelve a vida
          </p>
        </div>

        {/* Pedido + motivo */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-bold text-cafe"
              style={{ fontFamily: "Termina" }}
            >
              Folio {order.folio}
            </span>
            <span className="text-sm text-antojo font-bold">
              ${Number(order.total).toFixed(0)}
            </span>
          </div>
          <ul className="text-xs text-cafe space-y-0.5">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {it.quantity} × {it.product_name.split(" [")[0]}
                </span>
                <span className="text-canela">
                  ${(it.quantity * Number(it.unit_price)).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-caramelo/20">
            <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
              Nuestros cocineros te explicaron
            </div>
            <p className="text-xs text-cafe mt-1 italic">"{motivoFinal}"</p>
          </div>
        </div>

        {/* Selector de fecha */}
        <div className="bg-white rounded-xl p-3 mt-1">
          <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-1">
            Nueva fecha de recogida
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {fechaList.map((d) => {
              const iso = dateToIsoDay(d);
              const active = iso === pickupDate;
              const occ = occupancyMap.get(iso);
              const check = occ
                ? canDateAcceptCart(occ, cartCounts)
                : { ok: true, blockingCategories: [] };
              const blocked = !check.ok;
              const tight =
                occ &&
                !blocked &&
                (occ.worstStatus === "full" || occ.worstStatus === "tight");
              return (
                <button
                  key={iso}
                  onClick={() => !blocked && setPickupDate(iso)}
                  disabled={blocked}
                  className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                    blocked
                      ? "bg-canela/15 text-canela/50 line-through cursor-not-allowed"
                      : active
                        ? "bg-antojo text-white shadow"
                        : tight
                          ? "bg-[#F2A516]/15 text-[#B57A00] border border-[#F2A516]/40"
                          : "bg-crema text-cafe"
                  }`}
                >
                  {tight && !blocked && (
                    <span className="absolute -top-1 -right-1 bg-[#F2A516] text-white text-[11px] rounded-full px-1 leading-tight">
                      !
                    </span>
                  )}
                  <div className="capitalize whitespace-nowrap">
                    {d.toLocaleDateString("es-MX", { weekday: "short" })}
                  </div>
                  <div>{formatDateShort(d)}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-canela mt-2 italic">
            Escogiste:{" "}
            <b className="text-cafe capitalize">
              {formatDeliveryDate(new Date(pickupDate + "T12:00:00"))}
            </b>
          </div>
        </div>

        {error && (
          <p key={error} className="text-xs text-rojo text-center error-shake">
            {error}
          </p>
        )}

        <button
          onClick={reagendar}
          disabled={saving}
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-60 mt-2"
        >
          <IconCalendarEvent size={18} />
          {saving ? "Re-agendando…" : "Re-agendar mi antojo"}
        </button>

        <Link
          href={`/confirmacion/${order.folio}`}
          className="text-xs text-canela text-center underline mt-1"
        >
          Mejor lo dejo así
        </Link>

        <p className="text-[11px] text-canela text-center mt-2 italic max-w-xs mx-auto leading-relaxed">
          Tu antojo se conserva tal cual lo armaste — solo cambias la fecha 🤎
        </p>
      </div>
    </div>
  );
}
