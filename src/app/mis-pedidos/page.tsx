"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconReceipt2 } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Order, OrderItem } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import Miga from "@/components/Miga";

const ESTADOS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Esperando confirmación", color: "bg-canela/15 text-canela" },
  accepted: { label: "Aceptado", color: "bg-verde/15 text-verde" },
  baking: { label: "En el horno 🔥", color: "bg-antojo/15 text-antojo" },
  delivered: { label: "Entregado ✓", color: "bg-verde/15 text-verde" },
  declined: { label: "No pudo ser", color: "bg-rojo/15 text-rojo" },
  cancelled: { label: "Cancelado", color: "bg-canela/15 text-canela" },
};

export default function MisPedidos() {
  const router = useRouter();
  const { cliente } = useCarrito();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [cliente, router]);

  if (!cliente) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-20">
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
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <Miga pose="sentada" animation="sway" size={130} />
            <p className="text-canela text-sm">
              Aún no tienes pedidos.
              <br />
              <span className="text-caramelo italic">
                Pásate al menú y comenzamos.
              </span>
            </p>
            <Link
              href="/catalogo"
              className="bg-antojo text-white px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition shadow-md"
            >
              Ver el menú
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
                <Link
                  key={o.id}
                  href={`/confirmacion/${o.folio}?pago=${o.payment_method ?? "efectivo"}`}
                  className="bg-white rounded-2xl p-3 shadow-sm fade-up flex flex-col gap-1 active:scale-[0.98] transition"
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
                  <div className="text-xs text-cafe mt-1 truncate">
                    {o.items
                      .map((it) => `${it.quantity}× ${it.product_name}`)
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
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
