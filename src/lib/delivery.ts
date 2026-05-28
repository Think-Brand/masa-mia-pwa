// Helpers para calcular fecha mínima de recogida.
//
// Reglas:
// - Cada producto tiene `prep_days` (1 para Roles, Berlinesas, RollinBox; 2 para LuvinBox).
// - Si el cliente pide ANTES de las 12:00 PM, cuenta el día siguiente como día 1.
// - Si pide DESPUÉS de las 12:00 PM, se brinca un día.
// - Si el carrito mezcla categorías, manda el plazo MÁS LARGO.

const CUTOFF_HOUR = 12; // 12:00 PM

export function getMinPickupDate(maxPrepDays: number, now = new Date()): Date {
  // Día base
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  // Si pasó el cutoff, suma un día extra
  const extra = now.getHours() >= CUTOFF_HOUR ? 1 : 0;

  base.setDate(base.getDate() + maxPrepDays + extra);
  return base;
}

export function formatDeliveryDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export function dateToIsoDay(d: Date): string {
  // YYYY-MM-DD para el campo DATE de Postgres
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Genera lista de N fechas posibles a partir de la mínima
export function listAvailableDates(min: Date, count = 14): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(min);
    d.setDate(min.getDate() + i);
    out.push(d);
  }
  return out;
}
