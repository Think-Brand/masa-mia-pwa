"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  IconBrandWhatsapp,
  IconHome,
  IconCheck,
  IconMapPin,
  IconExternalLink,
  IconX,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Order, OrderItem } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";
import FeedbackPopup from "@/components/FeedbackWidget";
import CancelOrderModal from "@/components/CancelOrderModal";
import BirthdayPrompt from "@/components/BirthdayPrompt";
import { generarMensajeWhatsapp } from "@/lib/whatsapp";
import { getSettings, Settings } from "@/lib/settings";
import { formatDeliveryDate } from "@/lib/delivery";
import { checkCancelEligibility } from "@/lib/cancellation";

type OrderDetallado = Order & { items: OrderItem[] };

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-canela text-sm">Cargando…</div>}>
      <Confirmacion />
    </Suspense>
  );
}

function Confirmacion() {
  const params = useParams<{ folio: string }>();
  const search = useSearchParams();
  const { cliente } = useCarrito();
  const [order, setOrder] = useState<OrderDetallado | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
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
      getSettings(),
    ]).then(([{ data: order }, { data: items }, sets]) => {
      if (order) {
        const orderItems = (items ?? []).filter(
          (it: any) => it.order_id === order.id
        );
        setOrder({ ...order, items: orderItems });
      }
      setSettings(sets);
      setLoading(false);
    });
  }, [params.folio]);

  const abrirWhatsApp = () => {
    if (!order || !cliente || !settings) return;
    const destinoWa =
      order.contact_person === "alex"
        ? settings.contact_alex_wa
        : settings.contact_fabiola_wa;
    const itemsCart = order.items.map((it) => ({
      cartLineId: it.id,
      productId: it.product_id,
      name: it.product_name,
      price: Number(it.unit_price),
      image_url: null,
      quantity: it.quantity,
    }));
    const fechaEntrega = order.pickup_date
      ? formatDeliveryDate(new Date(order.pickup_date + "T12:00:00"))
      : undefined;
    const url = generarMensajeWhatsapp({
      cliente,
      items: itemsCart,
      total: Number(order.total),
      folio: order.folio,
      metodoPago: pago,
      fechaEntrega,
      destinoWa,
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
        Tu antojo quedó anotado.{" "}
        {order.contact_person && (
          <>
            <b className="text-cafe capitalize">
              {order.contact_person === "alex" ? "Alex" : "Fabiola"}
            </b>{" "}
            lo tiene en la mira.
            <br />
          </>
        )}
        <span className="text-caramelo italic">
          En breve te confirmamos por WhatsApp cuando entre al horno.
        </span>
      </p>

      {/* Folio */}
      <div
        className="mt-6 bg-white rounded-2xl px-6 py-4 shadow-sm stagger-item"
        data-stagger="0"
      >
        <div className="text-[11px] font-bold text-canela uppercase tracking-widest">
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
      <div
        className="mt-4 w-full bg-white/70 backdrop-blur rounded-2xl p-4 text-left stagger-item"
        data-stagger="1"
      >
        <div className="text-[11px] font-bold text-canela uppercase tracking-widest mb-2">
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
        <div className="text-[11px] text-canela mt-2 flex items-center gap-1">
          <IconCheck size={11} />
          Pago: {pago === "transferencia" ? "Transferencia BBVA" : "Efectivo al recibir"}
        </div>
        {order.pickup_date && (
          <div className="text-[11px] text-canela mt-1 flex items-center gap-1">
            <IconCheck size={11} />
            Recoges:{" "}
            <span className="capitalize">
              {formatDeliveryDate(new Date(order.pickup_date + "T12:00:00"))}
            </span>
          </div>
        )}
        {order.contact_person && (
          <div className="text-[11px] text-canela mt-1 flex items-center gap-1">
            <IconCheck size={11} />
            Te atiende:{" "}
            <span className="capitalize">
              {order.contact_person === "alex" ? "Alex" : "Fabiola"}
            </span>
          </div>
        )}
      </div>

      {/* Captura opcional de cumpleaños (Modelo B) — solo si no lo ha dado */}
      <BirthdayPrompt />

      {/* Dirección de recogida (solo después de confirmar) */}
      {settings && settings.pickup_address_full && (
        <div
          className="mt-4 w-full bg-white rounded-2xl p-4 text-left shadow-sm stagger-item"
          data-stagger="2"
        >
          <div className="flex items-start gap-2">
            <IconMapPin size={18} className="text-antojo flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-canela uppercase tracking-widest">
                Pasa por tu antojo
              </div>
              <div
                className="text-sm font-bold text-cafe mt-1"
                style={{ fontFamily: "Termina" }}
              >
                {settings.pickup_address_line1}
              </div>
              <div className="text-xs text-canela">
                {settings.pickup_address_line2}
                {settings.pickup_address_zip && `, ${settings.pickup_address_zip}`}
              </div>
              <div className="text-xs text-canela">{settings.pickup_address_city}</div>
              {settings.pickup_maps_url && (
                <a
                  href={settings.pickup_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-antojo"
                >
                  Abrir en Maps <IconExternalLink size={12} />
                </a>
              )}
              {settings.pickup_hours_note && (
                <p className="text-[11px] text-canela mt-2 italic">
                  {settings.pickup_hours_note}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner si está declinado: opción de cambiar fecha */}
      {order.status === "declined" && (
        <div
          className="mt-5 w-full bg-rojo/5 border-2 border-rojo/30 rounded-2xl p-4 stagger-item"
          data-stagger="3"
        >
          <div className="text-[11px] font-bold text-rojo uppercase tracking-wider text-center">
            Lo sentimos 🥲
          </div>
          {order.decline_message && (
            <p className="text-xs text-cafe italic mt-2 text-center">
              "{order.decline_message}"
            </p>
          )}
          <Link
            href={`/recuperar/${order.folio}`}
            className="mt-3 w-full bg-antojo text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow"
          >
            <IconCalendarEvent size={14} />
            Cambiar fecha sin rehacer
          </Link>
          <p className="text-[11px] text-canela text-center mt-2 italic">
            Tu antojo se conserva tal cual lo armaste 🤎
          </p>
        </div>
      )}

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

        {/* Botón cancelar (solo si elegible) */}
        {checkCancelEligibility({
          status: order.status,
          pickup_date: order.pickup_date,
        }).canCancel && (
          <button
            onClick={() => setCancelOpen(true)}
            className="text-[11px] text-canela underline flex items-center justify-center gap-1 active:scale-95 mt-1"
          >
            <IconX size={12} />
            Cancelar pedido
          </button>
        )}
      </div>

      <p className="text-[11px] text-canela mt-5 max-w-xs">
        Guarda este folio. Fabi o Alex lo van a ver en su panel.
      </p>

      {/* Popup de feedback (solo si pilot_mode está activo) */}
      <FeedbackPopup folio={order.folio} page="/confirmacion" />

      {/* Modal cancelar */}
      <CancelOrderModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        order={{
          id: order.id,
          folio: order.folio,
          status: order.status,
          pickup_date: order.pickup_date,
        }}
        onCancelled={() =>
          setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev))
        }
      />
    </main>
  );
}
