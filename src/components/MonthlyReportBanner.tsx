"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChartBar, IconX } from "@tabler/icons-react";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Aviso in-app para staff: al entrar en un mes nuevo, recuerda que el reporte
 * del mes anterior ya está listo y lleva a él. Sin correos — todo en la PWA.
 *
 * Se descarta por mes (localStorage), así que no molesta después de verlo y
 * reaparece solo el siguiente cierre de mes.
 */
export default function MonthlyReportBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Mes anterior al actual
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const slug = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const label = MESES[prev.getMonth()];
  const storageKey = `mmia_report_seen_${slug}`;

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(storageKey) === "1") setDismissed(true);
    } catch {
      /* sin localStorage: se muestra igual */
    }
  }, [storageKey]);

  const marcarVisto = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 mt-3">
      <div className="bg-cafe text-crema rounded-2xl p-3 flex items-center gap-3 shadow-md">
        <div className="bg-crema/15 rounded-xl p-2">
          <IconChartBar size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold capitalize" style={{ fontFamily: "Termina" }}>
            Tu reporte de {label} ya está listo
          </div>
          <div className="text-[11px] opacity-90">
            Revisa cómo cerró el mes.
          </div>
        </div>
        <Link
          href={`/staff/reporte/${slug}`}
          onClick={marcarVisto}
          className="bg-crema text-cafe rounded-lg px-3 py-1.5 text-xs font-bold active:scale-95 transition flex-shrink-0"
        >
          Ver reporte
        </Link>
        <button
          onClick={marcarVisto}
          aria-label="Descartar aviso"
          className="text-crema/70 active:scale-90 transition flex-shrink-0"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
