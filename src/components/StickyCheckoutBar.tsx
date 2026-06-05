"use client";

import { IconCircleCheck, IconLoader2 } from "@tabler/icons-react";

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

        {/* CTA + total */}
        <button
          onClick={onConfirm}
          disabled={disabled || loading}
          className="w-full bg-antojo text-white rounded-2xl py-3.5 flex items-center justify-between gap-3 px-4 active:scale-[0.98] transition shadow-lg disabled:bg-canela/40 disabled:text-cafe/40 disabled:cursor-not-allowed"
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
  );
}
