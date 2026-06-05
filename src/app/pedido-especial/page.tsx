"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconSparkles,
} from "@tabler/icons-react";
import { getSettings, Settings } from "@/lib/settings";
import { useCarrito } from "@/components/CarritoProvider";

/**
 * Pedido especial: para cosas fuera del catálogo normal o fuera de horario
 * (eventos, fines de semana, cantidades grandes, sabores custom, etc.).
 *
 * No genera orden en la DB. Solo arma un mensaje y abre WhatsApp con el
 * staff de Masa Mía para conversar el detalle.
 */
export default function PedidoEspecial() {
  const { cliente } = useCarrito();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Si ya hay cliente identificado, prellena.
  useEffect(() => {
    if (cliente?.name && !nombre) setNombre(cliente.name);
    if (cliente?.whatsapp && !whatsapp) setWhatsapp(cliente.whatsapp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.name, cliente?.whatsapp]);

  const canSubmit =
    nombre.trim().length > 1 &&
    whatsapp.trim().length >= 10 &&
    descripcion.trim().length > 5;

  const enviar = () => {
    if (!canSubmit || !settings) return;
    const destinoWa = settings.contact_fabiola_wa || "5218110050755";

    const lineas = [
      `¡Hola! Quiero hacer un pedido especial 🥐`,
      ``,
      `Nombre: ${nombre.trim()}`,
      `WhatsApp: ${whatsapp.trim()}`,
      fecha ? `Fecha aprox: ${fecha}` : null,
      hora ? `Hora aprox: ${hora}` : null,
      ``,
      `Detalle:`,
      descripcion.trim(),
    ].filter(Boolean) as string[];

    const text = encodeURIComponent(lineas.join("\n"));
    window.open(
      `https://wa.me/${destinoWa}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-10">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center gap-3 px-4 py-3">
        <Link href="/catalogo" aria-label="Atrás" className="text-cafe">
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
            width={130}
            height={130}
            className="mx-auto"
            priority
          />
          <p className="text-xs text-canela mt-1 italic max-w-xs mx-auto leading-relaxed">
            ¿Necesitas algo fuera de lo normal? Cuéntanos qué se te antoja y
            nuestros cocineros lo arman contigo por WhatsApp.
          </p>
        </div>

        <div className="bg-antojo/5 border border-antojo/30 rounded-2xl p-3 text-[11px] text-cafe leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1">
            <IconSparkles size={14} className="text-antojo" />
            <b>Cosas perfectas para pedido especial:</b>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Fines de semana o eventos</li>
            <li>Horarios fuera de 8 am – 8 pm</li>
            <li>Cantidades grandes (cumples, oficinas, regalos)</li>
            <li>Sabores o combinaciones que no están en el menú</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-3 flex flex-col gap-3 shadow-sm">
          <Campo
            label="Tu nombre"
            value={nombre}
            onChange={setNombre}
            placeholder="Mario"
          />
          <Campo
            label="WhatsApp (10 dígitos)"
            value={whatsapp}
            onChange={(v) => setWhatsapp(v.replace(/\D/g, "").slice(0, 10))}
            placeholder="811XXXXXXX"
            inputMode="numeric"
          />
          <div className="grid grid-cols-2 gap-2">
            <Campo
              label="Fecha aprox"
              value={fecha}
              onChange={setFecha}
              type="date"
            />
            <Campo
              label="Hora aprox"
              value={hora}
              onChange={setHora}
              type="time"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-canela uppercase tracking-wider block mb-1">
              ¿Qué se te antoja?
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. 50 berlinesas variadas para un cumple el sábado a las 10 am…"
              rows={4}
              className="w-full bg-crema-soft border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition resize-none"
            />
          </div>
        </div>

        <button
          onClick={enviar}
          disabled={!canSubmit}
          className="btn-masa btn-masa-primary w-full py-4 text-sm flex items-center justify-center gap-2"
          style={{ fontFamily: "Termina" }}
        >
          <IconBrandWhatsapp size={18} />
          <span className="font-bold">Mandar por WhatsApp</span>
        </button>

        <p className="text-[11px] text-canela italic text-center px-4 leading-relaxed">
          Se abre WhatsApp con tu mensaje listo. Nuestros cocineros responden
          en cuanto puedan para confirmar precio y entrega.
        </p>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-canela uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-crema-soft border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition"
      />
    </div>
  );
}
