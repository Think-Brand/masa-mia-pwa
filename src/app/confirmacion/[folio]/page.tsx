"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  IconBrandWhatsapp,
  IconHome,
  IconCheck,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Order, OrderItem } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";
import { generarMensajeWhatsapp } from "@/lib/whatsapp";

type OrderDetallado = Order & { items: OrderItem[] };

export default function Confirmacion() {
  const params = useParams<{ folio: string }>();
  const search = useSearchParams();
  const { cliente } = useCarrito();
  const [order, setOrder] = useState<OrderDetallado | null>(null);
  const [loading, setLoading] = useState(true);
  const pago = (search.get("pago") as "efectivo" | "transferencia") || "efectivo";

  useEffect(() => {
    if (!params.folio) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("folio", params.folio)
        .single(),
      supabase
        .from("order_items")
        .select("*")
        .order("created_at"),
    ]).then(([{ data: order }, { data: items }]) => {
      if (order) {
        const orderItems = (items ?? []).filter(
          (it: any) => it.order_id === order.id
        );
        setOrder({ ...order, items: orderItems });
      }
      setLoading(false);
    });
  }, [params.folio]);

  const abrirWhatsApp = () => {
    if (!order || !cliente) return;
    const itemsCart = order.items.map((it) => ({
      productId: it.product_id,
      name: it.product_name,
      price: Number(it.unit_price),
      image_url: null,
      quantity: it.quantity,
    }));
    const url = generarMensajeWhatsapp({
      cliente,
      items: itemsCart,
      total: Number(order.total),
      folio: order.folio,
      metodoPago: pago,
    });
    window.location.href = url;
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <Miga pose="cintura" animation="wiggle" size={140} />
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

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-8 max-w-md mx-auto text-center">
      <Miga pose="lista" animation="jump" size={150} priority />

      <h1
        className="text-3xl text-cafe mt-4 leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        ¡Pedido recibido!
      </h1>
      <p className="text-canela text-sm mt-3 max-w-xs leading-relaxed">
        Tu antojo quedó anotado. <br />
        <span className="text-caramelo italic">
          En breve te confirmamos por WhatsApp cuando entre al horno.
        </span>
      </p>

      {/* Folio */}
      <div className="mt-6 bg-white rounded-2xl px-6 py-4 shadow-sm fade-up">
        <div className="text-[10px] font-bold text-canela uppercase tracking-widest">
          Folio
        </div>
        <div
          className="text-3xl text-cafe mt-1"
          style={{ fontFamily: "ReginaBlack" }}
        >
          {order.folio}
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 w-full bg-white/70 backdrop-blur rounded-2xl p-4 text-left fade-up">
        <div className="text-[10px] font-bold text-canela uppercase tracking-widest mb-2">
          Resumen
        </div>
        <ul className="space-y-1">
          {order.items.map((it) => (
            <li
              key={it.id}
              className="text-xs text-cafe flex justify-between"
            >
              <span>
                {it.quantity} × {it.product_name}
              </span>
              <span className="font-bold">
                ${(Number(it.unit_price) * it.quantity).toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-caramelo/30">
          <span className="text-xs text-canela">Total</span>
          <span
            className="text-xl text-[#F25C20]"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ${Number(order.total).toFixed(0)}
          </span>
        </div>
        <div className="text-[10px] text-canela mt-2 flex items-center gap-1">
          <IconCheck size={11} />
          Pago: {pago === "transferencia" ? "Transferencia BBVA" : "Efectivo al recibir"}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 w-full flex flex-col gap-2 fade-up">
        <button
          onClick={abrirWhatsApp}
          className="w-full bg-[#25D366] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow"
        >
          <IconBrandWhatsapp size={18} />
          Avisar por WhatsApp
        </button>

        <Link
          href="/catalogo"
          className="w-full bg-white text-cafe border border-canela/40 rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <IconHome size={14} />
          Volver al menú
        </Link>
      </div>

      <p className="text-[10px] text-canela mt-5 max-w-xs">
        Guarda este folio. Fabi o Alex lo van a ver en su panel.
      </p>
    </main>
  );
}
