"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconSparkles,
  IconCalendar,
  IconClock,
  IconCash,
  IconBuildingBank,
  IconMinus,
  IconPlus,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import RegistroInline from "@/components/RegistroInline";
import Miga from "@/components/Miga";
import { getSettings, Settings } from "@/lib/settings";
import {
  listAllDatesFrom,
  todayStart,
  dateToIsoDay,
  formatDateShort,
  formatDeliveryDate,
} from "@/lib/delivery";

/**
 * Pedido especial: para eventos, fines de semana o cualquier día/hora fuera
 * del flujo normal (que solo permite L-V y horario 8 am – 8 pm).
 *
 * A diferencia del carrito normal:
 *  - Deja elegir CUALQUIER día (incluye fines de semana) y CUALQUIER hora.
 *  - Crea la orden marcada como `is_special`, que nace `pending` y le llega a
 *    Fabiola por Realtime para que la acepte (no es definitiva hasta entonces).
 *
 * Usa los mismos productos del catálogo (el carrito). Si el carrito está
 * vacío, invita a elegir del menú primero.
 */
export default function PedidoEspecial() {
  const router = useRouter();
  const { items, cliente, total, setQty, clear } = useCarrito();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pago, setPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);

  const fechaList = listAllDatesFrom(todayStart(), 30);
  const [pickupDate, setPickupDate] = useState<string>(
    dateToIsoDay(todayStart())
  );
  const [pickupTime, setPickupTime] = useState<string>("12:00");

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Mismo criterio de validez que el carrito.
  const clienteValido =
    !!cliente &&
    !!cliente.id &&
    !!cliente.name?.trim() &&
    !!cliente.whatsapp &&
    cliente.whatsapp.length === 10;

  const confirmar = async () => {
    if (items.length === 0) return;
    if (!clienteValido || !cliente?.id) {
      alert("Falta tu nombre y WhatsApp para solicitar el pedido especial.");
      return;
    }
    setEnviando(true);
    try {
      const supabase = createClient();
      const { data: order, error } = await supabase.rpc("create_order", {
        p_customer_id: cliente.id,
        p_payment_method: pago,
        p_notes: notas || null,
        p_pickup_date: pickupDate,
        p_pickup_time: pickupTime,
        p_contact_person: "fabiola",
        p_request_birthday: false,
        p_request_welcome: false,
        p_items: items.map((it) => ({
          product_id: it.productId,
          quantity: it.quantity,
          composition:
            it.composition && it.composition.length > 0
              ? it.composition
              : null,
        })),
        p_is_special: true,
        p_over_capacity: false,
      });
      if (error) throw error;
      if (!order?.folio) throw new Error("El servidor no devolvió folio.");
      clear();
      router.push(`/confirmacion/${order.folio}?pago=${pago}`);
    } catch (err) {
      console.error(err);
      alert("Algo se atascó. Intenta de nuevo o escríbenos por WhatsApp.");
      setEnviando(false);
    }
  };

  const fabiolaWa = settings?.contact_fabiola_wa || "5218110050755";
  const waFallback = `https://wa.me/${fabiolaWa}?text=${encodeURIComponent(
    "¡Hola! Quiero hacer un pedido especial 🥐"
  )}`;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-28">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center gap-3 px-4 py-3">
        <Link href="/carrito" aria-label="Atrás" className="text-cafe">
          <IconArrowLeft size={20} />
        </Link>
        <h1
          className="text-2xl text-cafe leading-none"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Pedido especial
        </h1>
      </header>

      <div className="px-4 pt-3 flex flex-col gap-3">
        <div className="text-center">
          <Image
            src="/mascota/miga-malabares.png"
            alt="Miga"
            width={120}
            height={120}
            className="mx-auto"
            priority
          />
          <p className="text-xs text-canela mt-1 italic max-w-xs mx-auto leading-relaxed">
            ¿Lo tuyo es para un fin de semana, un evento o una hora fuera de lo
            normal? Aquí eliges el día y la hora que quieras. Fabiola lo revisa
            y te confirma 🤎
          </p>
        </div>

        <div className="bg-antojo/5 border border-antojo/30 rounded-2xl p-3 text-[11px] text-cafe leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1">
            <IconSparkles size={14} className="text-antojo" />
            <b>Perfecto para pedido especial:</b>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Fines de semana o eventos</li>
            <li>Horarios fuera de 8 am – 8 pm</li>
            <li>Cantidades grandes (cumples, oficinas, regalos)</li>
          </ul>
        </div>

        {/* Sin items: invitar a elegir del menú */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <Miga emocion="confundida" animation="sway" size={150} />
            <p className="text-canela text-sm leading-relaxed">
              Primero arma tu antojo del menú.
              <br />
              <span className="text-caramelo italic">
                Luego escoges el día y la hora especiales.
              </span>
            </p>
            <Link
              href="/catalogo"
              className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition"
            >
              Ver menú
            </Link>
          </div>
        ) : (
          <>
            {/* Registro del cliente si hace falta */}
            {!clienteValido && <RegistroInline />}

            {/* Resumen del antojo */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
                Tu antojo
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((it) => (
                  <li
                    key={it.cartLineId}
                    className="flex items-center gap-2 text-sm text-cafe"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{it.name}</div>
                      <div className="text-[11px] text-canela">
                        ${it.price.toFixed(0)} c/u
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(242,92,32,0.06), rgba(242,92,32,0.16))",
                      }}
                    >
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity - 1)}
                        aria-label="Quitar uno"
                        className="btn-masa btn-masa-mini"
                      >
                        <IconMinus size={14} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity + 1)}
                        aria-label="Agregar uno"
                        className="btn-masa btn-masa-mini"
                      >
                        <IconPlus size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/catalogo"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-antojo"
              >
                <IconPlus size={13} /> Agregar más del menú
              </Link>
              <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-caramelo/30">
                <span className="text-xs text-canela">Estimado</span>
                <span
                  className="text-lg text-[#F25C20]"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  ${total.toFixed(0)}
                </span>
              </div>
              <p className="text-[11px] text-canela italic mt-1">
                Fabiola te confirma el precio final al aceptar (puede variar
                por cantidad o entrega).
              </p>
            </div>

            {/* Día — cualquier día, incluye fines de semana */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
                <IconCalendar size={14} /> ¿Qué día?
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {fechaList.map((d) => {
                  const iso = dateToIsoDay(d);
                  const active = iso === pickupDate;
                  return (
                    <button
                      key={iso}
                      onClick={() => setPickupDate(iso)}
                      className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                        active
                          ? "bg-antojo text-white shadow"
                          : "bg-crema text-cafe"
                      }`}
                    >
                      <div className="capitalize whitespace-nowrap">
                        {d.toLocaleDateString("es-MX", { weekday: "short" })}
                      </div>
                      <div>{formatDateShort(d)}</div>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-canela mt-2 capitalize">
                Elegiste:{" "}
                <b className="text-cafe">
                  {formatDeliveryDate(new Date(pickupDate + "T12:00:00"))}
                </b>
              </div>
            </div>

            {/* Hora — libre (puede ser fuera de 8-8) */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
                <IconClock size={14} /> ¿A qué hora?
              </div>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value || "12:00")}
                className="w-full bg-crema-soft border border-caramelo/40 rounded-xl px-3 py-2.5 text-sm text-cafe focus:outline-none focus:border-cafe transition appearance-none"
              />
              <div className="text-[11px] text-canela mt-1.5 italic">
                Para especiales puedes pedir cualquier hora — lo afinamos al
                confirmar.
              </div>
            </div>

            {/* Pago */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
                ¿Cómo pagas?
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPago("efectivo")}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                    pago === "efectivo"
                      ? "bg-[#5B7A3A] text-white shadow-md"
                      : "bg-white text-[#5B7A3A] border-2 border-[#5B7A3A]/50 opacity-70"
                  }`}
                >
                  <IconCash size={18} />
                  Efectivo
                </button>
                <button
                  onClick={() => setPago("transferencia")}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                    pago === "transferencia"
                      ? "bg-[#004481] text-white shadow-md"
                      : "bg-white text-[#004481] border-2 border-[#004481]/50 opacity-70"
                  }`}
                >
                  <IconBuildingBank size={18} />
                  Transferencia
                </button>
              </div>
            </div>

            {/* Notas */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <label className="text-[11px] font-bold text-canela uppercase tracking-wider block mb-1.5">
                Detalles del evento (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Es para un cumple de oficina, ¿pueden entregar empacado para regalo? Sin nuez por alergia…"
                rows={3}
                className="w-full bg-crema-soft border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition resize-none"
              />
            </div>

            <p className="text-[11px] text-canela italic text-center px-2 leading-relaxed">
              Al solicitarlo, tu pedido le llega a Fabiola para que lo acepte.
              Te confirmamos por WhatsApp 🤎
            </p>

            <a
              href={waFallback}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-canela text-center italic underline flex items-center justify-center gap-1"
            >
              <IconBrandWhatsapp size={12} /> ¿Prefieres platicarlo? Escríbenos
              por WhatsApp
            </a>
          </>
        )}
      </div>

      {/* Sticky: solicitar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-crema via-crema/95 to-transparent">
          <button
            onClick={confirmar}
            disabled={!clienteValido || enviando}
            className="btn-masa btn-masa-primary w-full py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "Termina" }}
          >
            <IconSparkles size={18} />
            <span className="font-bold">
              {!clienteValido
                ? "Cuéntanos quién eres ↑"
                : enviando
                  ? "Enviando a Fabiola…"
                  : "Solicitar pedido especial"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
