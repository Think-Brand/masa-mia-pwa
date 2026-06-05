"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { useCarrito } from "./CarritoProvider";

/**
 * Carrito flotante (Feature 3).
 *
 * Barra fija justo encima del BottomNav. Aparece con slide-up + spring cuando
 * hay algo en el carrito (count > 0) y se va cuando se vacía. Miga celebra el
 * antojo: "agradecida" normal, "sorprendida" cuando el pedido ya es generoso
 * (≥ 4). El contenedor de Miga es además el destino del fly-to-cart
 * (id="cart-fly-target").
 */
export default function FloatingCart() {
  const { count, total } = useCarrito();
  const [mounted, setMounted] = useState(false);
  const prevCount = useRef(count);
  const [react, setReact] = useState(false);

  // Pequeño "respingo" de Miga cada vez que sube el count.
  useEffect(() => {
    if (count > prevCount.current) {
      setReact(true);
      const t = window.setTimeout(() => setReact(false), 600);
      prevCount.current = count;
      return () => window.clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  // Evita parpadeo en SSR/hidratación: solo renderiza tras montar en cliente.
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;

  const generoso = count >= 4;
  const miga = generoso
    ? "/mascota/sorprendida.png"
    : "/mascota/agradecida.png";

  return (
    <div
      className="fixed left-0 right-0 z-40 max-w-md mx-auto px-3 floating-cart-enter pointer-events-none"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 66px)",
      }}
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur border border-caramelo/25 rounded-2xl shadow-[0_8px_24px_rgba(58,39,29,0.18)] flex items-center gap-2.5 pl-2 pr-2 py-2">
        {/* Miga — también es el blanco del fly-to-cart */}
        <div
          id="cart-fly-target"
          className="relative w-12 h-12 flex-shrink-0"
        >
          <Image
            src={miga}
            alt=""
            aria-hidden="true"
            fill
            sizes="48px"
            className={`object-contain drop-shadow-sm ${
              react ? "anim-jump" : "anim-bounce"
            }`}
          />
        </div>

        {/* Centro: resumen del antojo */}
        <div className="flex-1 min-w-0 leading-tight">
          <div
            className="text-[11px] font-bold text-canela uppercase tracking-wider"
            style={{ fontFamily: "Termina" }}
          >
            Tu antojo
          </div>
          <div className="text-sm text-cafe font-bold tabular-nums">
            {count} {count === 1 ? "producto" : "productos"} ·{" "}
            <span className="text-antojo">${total.toFixed(0)}</span>
          </div>
        </div>

        {/* Botón clay → carrito */}
        <Link
          href="/carrito"
          aria-label={`Ver tu antojo, ${count} ${
            count === 1 ? "producto" : "productos"
          }, total ${total.toFixed(0)} pesos`}
          className="btn-masa btn-masa-primary flex items-center gap-1.5 pl-4 pr-3.5 py-2.5 text-sm font-bold text-white flex-shrink-0"
          style={{ minHeight: 44 }}
        >
          Ver
          <IconArrowRight size={18} stroke={2.5} />
        </Link>
      </div>
    </div>
  );
}
