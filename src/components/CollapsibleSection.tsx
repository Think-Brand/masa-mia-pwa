"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

/**
 * Sección colapsable para el carrito.
 *
 * Cuando colapsada: muestra ícono + título + resumen (la decisión actual del
 * cliente, ej. "lun 8 jun · 12:00 pm") + chevron.
 *
 * Cuando abierta: muestra header + children (el picker / form).
 *
 * Default cerrada para reducir scroll, pero el caller puede pasar
 * `defaultOpen` si quiere que arranque expandida (ej. cuando no hay valor
 * elegido todavía).
 */
type Props = {
  icon?: React.ReactNode;
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  /** Si true, el contenido NO se colapsa nunca (siempre visible). */
  alwaysOpen?: boolean;
  /** Estilo de borde/acento. ok=neutro, warn=amarillo, error=rojo */
  status?: "ok" | "warn" | "error";
  children: React.ReactNode;
};

export default function CollapsibleSection({
  icon,
  title,
  summary,
  defaultOpen = false,
  alwaysOpen = false,
  status = "ok",
  children,
}: Props) {
  const [open, setOpen] = useState(alwaysOpen || defaultOpen);

  const borderColor =
    status === "warn"
      ? "border-[#F2A516]/40"
      : status === "error"
        ? "border-rojo/40"
        : "border-caramelo/30";

  return (
    <div
      className={`bg-white rounded-xl border ${borderColor} overflow-hidden`}
    >
      <button
        onClick={() => !alwaysOpen && setOpen((v) => !v)}
        disabled={alwaysOpen}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left active:bg-crema-soft transition"
      >
        {icon && (
          <span className="flex-shrink-0 text-cafe">{icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-bold text-canela uppercase tracking-wider leading-none"
            style={{ fontFamily: "Termina" }}
          >
            {title}
          </div>
          {summary && !open && (
            <div className="text-sm text-cafe font-bold mt-1 truncate">
              {summary}
            </div>
          )}
        </div>
        {!alwaysOpen && (
          <IconChevronDown
            size={18}
            className={`flex-shrink-0 text-canela transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {/* Truco moderno: grid-template-rows 0fr → 1fr con transition.
          Permite altura "auto" animable sin medir el contenido con JS,
          y sin overflow visual mientras transiciona. */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-3 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
