// Destacados — cálculo de best-sellers para el catálogo.
//
// Se usa desde el route handler /api/destacados (server-side, cacheado por
// día en zona America/Mexico_City). Devuelve el "Antojo del día" (rotación
// determinística por fecha, sin repetir hasta agotar el pool) y la lista de
// "Los más pedidos" para el carrusel. Hero (Feature 1) y carrusel (Feature 2)
// comparten exactamente este cálculo: una sola fuente de verdad.

import { Product } from "./types";

export type Destacados = {
  productOfDay: Product | null;
  topSellers: Product[];
  /** 'history' = hay pedidos reales; 'fallback' = aún no hay datos suficientes. */
  source: "history" | "fallback";
};

/** Fecha "YYYY-MM-DD" en la zona horaria de la cocina (Mexico_City). */
export function mxDayString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Índice de día (días desde epoch) anclado a la medianoche de Mexico_City.
 * Estable durante todo el día y avanza +1 al cruzar la medianoche local —
 * esto es lo que hace rotar el Antojo del día.
 */
export function mxDayIndex(d: Date = new Date()): number {
  const s = mxDayString(d); // YYYY-MM-DD
  return Math.floor(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
}

/** Elige el elemento del pool de forma determinística por día. */
export function pickForDay<T>(pool: T[], dayIndex: number): T | null {
  if (pool.length === 0) return null;
  const idx = ((dayIndex % pool.length) + pool.length) % pool.length;
  return pool[idx];
}
