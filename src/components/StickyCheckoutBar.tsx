"use client";

import { useState } from "react";
import { IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import Confetti from "./Confetti";

/**
 * Barra inferior fija con total + botón confirmar. Siempre visible mientras
 * el cliente arma su carrito → puede confirmar en cualquier momento sin
 * llegar al fondo.
 *
 * Descuentos aplicados se muestran INLINE arriba del total, sin banners
 * separados que rompan el flujo.
 */
type Props = {
  subtotal: number;
  descuento?: { label: string; monto: number } | null;
  total: number;
  ctaLabel: string;
  /** Si está deshabilitado, sale como botón gris con razón */
  disabled?: boolean;
  /** Para mostrar spinner mientras envía */
  loading?: boolean;
  onConfirm: () => void;
};

export default function StickyCheckoutBar({
  subtotal,
  descuento,
  total,
  ctaLabel,
  disabled = false,
  loading = false,
  onConfirm,
}: Props) {
  const tieneDescuento = !!descuento && descuento.monto > 0;
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const handleConfirm = () => {
    if (disabled || loading) return;
    setConfettiTrigger(Date.now());
    onConfirm();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-crema/95 backdrop-blur border-t border-caramelo/30 shadow-[0_-4px_20px_rgba(58,39,29,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex flex-col gap-2">
        {/* Subtotal + descuento + total — compacto en 1-2 líneas */}
        {tieneDescuento && (
          <div className="flex flex-col gap-0.5 text-[11px]">
            <div className="flex items-center justify-between text-canela">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-antojo font-bold">
              <span>{descuento!.label}</span>
              <span>−${descuento!.monto.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* CTA + total — squircle naranja v8 con confetti al confirmar.
            Wrapper relative para anclar el confetti que sale del centro. */}
        <div className="relative">
          <Confetti trigger={confettiTrigger} />
          <button
            onClick={handleConfirm}
            disabled={disabled || loading}
            className="btn-masa btn-masa-primary w-full py-4 flex items-center justify-between gap-3 px-5"
            style={{ fontFamily: "Termina" }}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              {loading ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : (
                <IconCircleCheck size={18} />
              )}
              {ctaLabel}
            </span>
            <span
              className="text-xl"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ${total.toFixed(0)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
