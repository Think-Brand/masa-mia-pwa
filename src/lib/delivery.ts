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

  // Skip sábado/domingo: si cae en fin de semana, avanza al lunes.
  // Operamos solo L-V (los pedidos de fin de semana van por /pedido-especial).
  while (base.getDay() === 0 || base.getDay() === 6) {
    base.setDate(base.getDate() + 1);
  }
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

// Genera lista de N días HÁBILES (lunes a viernes) a partir de la mínima.
// Salta sábados (6) y domingos (0). Para pedidos en fin de semana o eventos,
// el cliente usa /pedido-especial que va a WhatsApp manual.
export function listAvailableDates(min: Date, count = 14): Date[] {
  const out: Date[] = [];
  const cursor = new Date(min);
  while (out.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      out.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Genera lista de N días corridos (INCLUYE sábados y domingos) a partir de
// una fecha base. Pensado para el staff (Fabiola/Alex), que captura pedidos
// tradicionales y debe poder elegir cualquier día —fines de semana incluidos—
// sin las reglas de cupo ni el filtro L-V del flujo de autoservicio.
export function listAllDatesFrom(start: Date, count = 30): Date[] {
  const out: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (out.length < count) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Día base de hoy (00:00 local). El servidor acepta cualquier pickup_date >= hoy.
export function todayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Slots de hora de recogida: cada 2 horas entre 8 am y 8 pm.
// Devuelve ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].
// Separar pickups en bloques de 2h ayuda a no amontonar gente en la puerta.
// Si el cliente necesita otra hora exacta, el flujo es /pedido-especial.
export function listPickupTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 8; h <= 20; h += 2) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

export function formatPickupTimeLabel(slot: string): string {
  // "14:30" → "2:30 pm"
  const [h, m] = slot.split(":").map((n) => parseInt(n, 10));
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
