"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IconBrandWhatsapp,
  IconTruck,
  IconX,
} from "@tabler/icons-react";

/**
 * Botón condicional + modal para consultar envío.
 *
 * Visibilidad: solo aparece si el carrito supera `umbral` (default $400).
 * Razonamiento (Modelo B): no queremos ofrecer envío a todo el mundo —
 * mantenemos pickup como modelo principal. Pero a pedidos grandes (Luvin,
 * cumple para varios, oficina) sí vale la pena abrir la conversación con
 * Fabi para que ella decida caso por caso.
 *
 * El modal tiene un copy honesto (no prometemos servicio formal) y un CTA
 * a WhatsApp pre-rellenado para que Fabiola sepa de qué pedido se trata.
 */
type Props = {
  total: number;
  nombreCliente?: string;
  resumenItems?: string;
  fabiolaWa?: string;
  /** Umbral mínimo del carrito para mostrar el prompt. Default $400. */
  umbral?: number;
};

export default function EnvioPrompt({
  total,
  nombreCliente,
  resumenItems,
  fabiolaWa,
  umbral = 400,
}: Props) {
  const [open, setOpen] = useState(false);

  // No renderiza si el carrito no llega al umbral
  if (total < umbral) return null;

  const waMessage = encodeURIComponent(
    `Hola Fabi, soy ${nombreCliente || "un cliente"}. Estoy armando un pedido en masamia.mx por $${total.toFixed(0)}${
      resumenItems ? ` (${resumenItems})` : ""
    }. ¿Es posible que me lo lleves? Te dejo la dirección y vemos si se puede arreglar 🤎`
  );
  const waUrl = fabiolaWa
    ? `https://wa.me/${fabiolaWa}?text=${waMessage}`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-dashed border-cafe/30 rounded-xl px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.99] transition text-left"
        aria-label="Consultar envío"
      >
        <div className="w-9 h-9 rounded-full bg-cafe/10 flex items-center justify-center text-cafe flex-shrink-0">
          <IconTruck size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-bold text-cafe leading-tight"
            style={{ fontFamily: "Termina" }}
          >
            ¿Vives lejos? ¿Necesitas que te lo lleven?
          </div>
          <div className="text-[11px] text-canela italic mt-0.5 leading-tight">
            Para pedidos grandes, a veces se puede arreglar.
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-cafe/70 backdrop-blur-sm px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-5 pb-7 modal-enter shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/mascota/una-idea.png"
                  alt="Miga con idea"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain"
                />
                <div>
                  <h2
                    className="text-2xl text-cafe leading-none"
                    style={{ fontFamily: "ReginaBlack" }}
                  >
                    ¿Te lo llevamos?
                  </h2>
                  <p className="text-[11px] text-canela italic mt-0.5">
                    Lo platicamos honesto.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-white text-cafe flex items-center justify-center active:scale-90 transition shadow-sm flex-shrink-0"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="bg-white/80 rounded-2xl p-4 text-sm text-cafe leading-relaxed">
              <p>
                Sinceros: <b>no tenemos servicio de envíos como tal</b> —
                somos chiquitos y horneamos bajo pedido. Pero si vives cerca
                y tu antojo es <b>generoso</b>, escríbele a Fabi: a veces
                se puede arreglar un movimiento.
              </p>
              <p className="mt-2 text-xs text-canela italic">
                No prometemos nada hasta que ella te confirme. Si no se
                puede, te lo dice clarito.
              </p>
            </div>

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="mt-4 w-full bg-[#25D366] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
              >
                <IconBrandWhatsapp size={18} />
                Escribirle a Fabi
              </a>
            ) : (
              <div className="mt-4 text-xs text-canela italic text-center">
                Falta configurar el WhatsApp de Fabi en ajustes.
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-2 text-[11px] text-canela italic active:scale-95 transition"
            >
              Cerrar, mejor sigo armando el pedido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
