"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCalendarSearch } from "@tabler/icons-react";

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

/** El negocio arrancó en 2026; permitimos desde 2025 por si hay datos previos. */
const FIRST_YEAR = 2025;

/**
 * Selector de mes/año para saltar directo a cualquier reporte mensual.
 * `year` / `month` (1-12) son el periodo mostrado, para preseleccionar.
 */
export default function ReportMonthPicker({
  year,
  month,
}: {
  year: number;
  month: number; // 1-12
}) {
  const router = useRouter();
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);

  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let yr = FIRST_YEAR; yr <= thisYear; yr++) years.push(yr);

  const ir = () => {
    const slug = `${y}-${String(m).padStart(2, "0")}`;
    router.push(`/staff/reporte/${slug}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={m}
        onChange={(e) => setM(Number(e.target.value))}
        className="bg-white border border-caramelo/40 rounded-lg px-2 py-1.5 text-xs text-cafe capitalize focus:outline-none focus:border-cafe"
      >
        {MESES.map((nombre, i) => (
          <option key={i} value={i + 1}>
            {nombre}
          </option>
        ))}
      </select>
      <select
        value={y}
        onChange={(e) => setY(Number(e.target.value))}
        className="bg-white border border-caramelo/40 rounded-lg px-2 py-1.5 text-xs text-cafe focus:outline-none focus:border-cafe"
      >
        {years.map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>
      <button
        onClick={ir}
        className="bg-cafe text-crema rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 active:scale-95 transition"
      >
        <IconCalendarSearch size={13} />
        Ver
      </button>
    </div>
  );
}
