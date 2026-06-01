"use client";

import { IconPrinter } from "@tabler/icons-react";

/**
 * Botón para disparar window.print().
 * Está en client component porque window.print() solo existe en el navegador.
 */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-antojo text-white rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-sm"
      style={{ fontFamily: "Termina" }}
    >
      <IconPrinter size={14} />
      Imprimir / Guardar PDF
    </button>
  );
}
