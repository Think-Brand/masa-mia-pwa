"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconRepeat, IconX, IconCalendarEvent } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Order, OrderItem, Product } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import Miga from "@/components/Miga";
import CancelOrderModal from "@/components/CancelOrderModal";
import { checkCancelEligibility } from "@/lib/cancellation";

const ESTADOS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Esperando confirmación", color: "bg-canela/15 text-canela" },
  accepted: { label: "Aceptado", color: "bg-verde/15 text-verde" },
  baking: { label: "En el horno 🔥", color: "bg-antojo/15 text-antojo" },
  delivered: { label: "Entregado ✓", color: "bg-verde/15 text-verde" },
  declined: { label: "Lo sentimos", color: "bg-rojo/15 text-rojo" },
  cancelled: { label: "Cancelado", color: "bg-canela/15 text-canela" },
};

export default function MisPedidos() {
  const router = useRouter();
  const { cliente, add } = useCarrito();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [repitiendo, setRepitiendo] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    folio: string;
    status: string;
    pickup_date: string | null;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const repetirPedido = async (order: Order & { items: OrderItem[] }) => {
    setRepitiendo(order.id);
    const supabase = createClient();
    // Productos que NO son boxes (los boxes los volveríamos a armar manualmente)
    const productIds = Array.from(
      new Set(
        order.items
          .filter((it) => !it.product_name.includes(" ["))
          .map((it) => it.product_id)
      )
    );
    if (productIds.length === 0) {
      alert("Este pedido tenía una caja personalizada. Vuelve a armarla desde el menú 🤎");
      setRepitiendo(null);
      return;
    }
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    const byId = new Map<string, Product>(
      ((prods ?? []) as Product[]).map((p) => [p.id, p])
    );

    for (const it of order.items) {
      if (it.product_name.includes(" [")) continue; // skip boxes
      const p = byId.get(it.product_id);
      if (p) add(p, it.quantity);
    }
    router.push("/carrito");
  };

  useEffect(() => {
    if (!cliente) {
      router.replace("/");
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", cliente.id)
        .order("created_at", { ascending: false });

      if (!ords || ords.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const ids = ords.map((o: Order) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", ids);

      const withItems = ords.map((o: Order) => ({
        ...o,
        items: (items as OrderItem[] | null)?.filter(
          (i) => i.order_id === o.id
        ) ?? [],
      }));
      setOrders(withItems);
      setLoading(false);
    })();
  }, [cliente, router, reloadKey]);

  if (!cliente) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur px-4 py-3 border-b border-caramelo/20">
        <h1
          className="text-2xl text-cafe text-center"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Mis pedidos
        </h1>
      </header>

      <div className="flex-1 px-4 py-4">
        {loading && (
          <div className="text-center text-canela text-sm">Cargando…</div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-4 py-6">
            <Miga pose="sentada" animation="sway" size={130} />
            <p className="text-canela text-sm leading-relaxed">
              Aún no tienes pedidos.
              <br />
              <span className="text-caramelo italic">
                ¿Te ayudamos a estrenarte?
              </span>
            </p>

            {/* Mini banner Antójame */}
            <Link
              href="/antojame"
              className="relative w-full bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition shadow-md overflow-hidden"
            >
              <div className="relative w-16 h-16 flex-shrink-0 -my-2 -ml-1">
                <Image
                  src="/mascota/recomendando.png"
                  alt="Miga recomendando"
                  fill
                  sizes="64px"
                  className="object-cover object-top drop-shadow"
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[10px] font-bold opacity-90 uppercase tracking-wider">
                  No sé qué pedir…
                </div>
                <div
                  className="text-xl leading-none"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  ¡Antójame!
                </div>
              </div>
            </Link>

            <p className="text-[11px] text-canela mt-1">
              O si quieres antojarte solo:
            </p>
            <Link
              href="/catalogo"
              className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition"
            >
              Ver menú completo
            </Link>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <ul className="flex flex-col gap-3">
            {orders.map((o) => {
              const status = ESTADOS_LABEL[o.status] ?? ESTADOS_LABEL.pending;
              const fecha = new Date(o.created_at).toLocaleDateString(
                "es-MX",
                {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              return (
                <article
                  key={o.id}
                  className="bg-white rounded-2xl p-3 shadow-sm fade-up flex flex-col gap-1"
                >
                  <Link
                    href={`/confirmacion/${o.folio}?pago=${o.payment_method ?? "efectivo"}`}
                    className="active:scale-[0.98] transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="text-sm font-bold text-cafe"
                        style={{ fontFamily: "Termina" }}
                      >
                        {o.folio}
                      </div>
                      <div
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}
                      >
                        {status.label}
                      </div>
                    </div>
                    <div className="text-[10px] text-canela">{fecha}</div>
                    <div className="text-xs text-cafe mt-1 line-clamp-2">
                      {o.items
                        .map((it) => `${it.quantity}× ${it.product_name.split(" [")[0]}`)
                        .join(", ")}
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-[10px] text-canela">Total</span>
                      <span
                        className="text-base text-[#F25C20]"
                        style={{ fontFamily: "ReginaBlack" }}
                      >
                        ${Number(o.total).toFixed(0)}
                      </span>
                    </div>
                  </Link>
                  {/* Si está declinado: ofrecer recuperar */}
                  {o.status === "declined" && (
                    <div className="mt-2 bg-rojo/5 border border-rojo/20 rounded-xl p-2.5">
                      {o.decline_message && (
                        <p className="text-[11px] text-cafe italic mb-2">
                          "{o.decline_message}"
                        </p>
                      )}
                      <Link
                        href={`/recuperar/${o.folio}`}
                        className="w-full bg-antojo text-white rounded-lg py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <IconCalendarEvent size={13} />
                        Cambiar fecha sin rehacer
                      </Link>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => repetirPedido(o)}
                      disabled={repitiendo === o.id}
                      className="flex-1 bg-crema text-cafe rounded-xl py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
                    >
                      <IconRepeat size={13} />
                      {repitiendo === o.id ? "Cargando..." : "Pedir lo mismo"}
                    </button>
                    {checkCancelEligibility({
                      status: o.status,
                      pickup_date: o.pickup_date,
                    }).canCancel && (
                      <button
                        onClick={() =>
                          setCancelTarget({
                            id: o.id,
                            folio: o.folio,
                            status: o.status,
                            pickup_date: o.pickup_date,
                          })
                        }
                        className="px-3 bg-white border border-rojo/30 text-rojo rounded-xl py-2 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <IconX size={13} />
                        Cancelar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />

      {cancelTarget && (
        <CancelOrderModal
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          order={cancelTarget}
          onCancelled={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
