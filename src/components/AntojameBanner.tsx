"use client";

import Image from "next/image";
import Link from "next/link";
import { IconSparkles } from "@tabler/icons-react";

/**
 * Banner "¡Antójame!" — única fuente de verdad del CTA.
 *
 * Mismo estilo y color del banner principal del catálogo (botón clay
 * btn-masa-antojame, contenido centrado, ✨ a la derecha). Antes vivía
 * duplicado y desalineado en carrito y mis-pedidos; ahora todos comparten
 * este componente. `className` controla solo el espaciado/ancho externo.
 */
export default function AntojameBanner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="/antojame"
      className={`btn-masa btn-masa-antojame relative flex items-center justify-center gap-3 pl-3 pr-12 py-3 ${className}`}
    >
      {/* Miga ligeramente a la izquierda; el ✨ a la derecha equilibra el peso
          óptico para que el conjunto se vea centrado. */}
      <div className="relative w-20 h-20 flex-shrink-0 -my-3">
        <Image
          src="/mascota/recomendando.png"
          alt="Miga recomendando"
          fill
          sizes="80px"
          className="object-cover object-top drop-shadow-md"
        />
      </div>
      <div className="min-w-0 text-center">
        <div
          className="text-[11px] font-bold opacity-90 uppercase tracking-wider"
          style={{ fontFamily: "Termina" }}
        >
          No sé qué pedir…
        </div>
        <div className="text-2xl leading-none" style={{ fontFamily: "ReginaBlack" }}>
          ¡Antójame!
        </div>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 rounded-full p-2">
        <IconSparkles size={18} />
      </div>
    </Link>
  );
}
