/**
 * Helpers para cumpleaños de clientes.
 * Formato: 'MM-DD' (ej: '07-12' para 12 de julio).
 */

const MONTHS_ES = [
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

/** Devuelve la fecha de hoy en formato 'MM-DD' usando hora local. */
export function todayMD(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** Devuelve true si la fecha 'MM-DD' del cliente es hoy. */
export function isBirthdayToday(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  return birthday === todayMD();
}

/** Devuelve true si el cumple es entre hoy y dentro de N días (inclusive). */
export function isBirthdayWithinDays(
  birthday: string | null | undefined,
  daysAhead: number
): boolean {
  if (!birthday) return false;
  const today = new Date();
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    if (`${mm}-${dd}` === birthday) return true;
  }
  return false;
}

/** Días hasta el próximo cumpleaños. 0 si es hoy, -1 si inválido. */
export function daysUntilBirthday(birthday: string | null | undefined): number {
  if (!birthday) return -1;
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  let next = new Date(year, mm - 1, dd);
  next.setHours(0, 0, 0, 0);
  if (next < today) next = new Date(year + 1, mm - 1, dd);
  const ms = next.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Formatea 'MM-DD' como '12 de julio' o '' si inválido. */
export function formatBirthday(birthday: string | null | undefined): string {
  if (!birthday) return "";
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return "";
  return `${dd} de ${MONTHS_ES[mm - 1]}`;
}

/** Formatea 'MM-DD' como 'jul 12' (compacto). */
export function formatBirthdayShort(birthday: string | null | undefined): string {
  if (!birthday) return "";
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return "";
  return `${MONTHS_ES[mm - 1].slice(0, 3)} ${dd}`;
}

/** Devuelve los nombres de meses en español. */
export const MESES = MONTHS_ES;

/** Calcula cuántos días tiene un mes (1-12). */
export function diasEnMes(mes: number, year?: number): number {
  const y = year ?? new Date().getFullYear();
  return new Date(y, mes, 0).getDate();
}

/**
 * Anti-trampa: cuántos días lleva el cumple registrado.
 * Si fue agregado/cambiado hace menos de 7 días, no aplica descuento aún.
 */
export const BIRTHDAY_SETTLE_DAYS = 7;

export function daysSinceBirthdaySet(
  birthdaySetAt: string | null | undefined
): number {
  if (!birthdaySetAt) return 0;
  const set = new Date(birthdaySetAt);
  const now = new Date();
  const ms = now.getTime() - set.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isBirthdayEditable(
  birthday: string | null | undefined
): { editable: boolean; unlockDate: string | null } {
  // Si está dentro de 7 días antes o después del cumple, NO editable
  if (!birthday) return { editable: true, unlockDate: null };
  const days = daysUntilBirthday(birthday);
  // Si quedan 0-7 días: bloquear
  if (days >= 0 && days <= BIRTHDAY_SETTLE_DAYS) {
    // Calcular cuándo se desbloquea (después del cumple + buffer)
    const [mm, dd] = birthday.split("-").map(Number);
    const today = new Date();
    const year =
      days === 0
        ? today.getFullYear()
        : new Date(today.getFullYear(), mm - 1, dd) < today
          ? today.getFullYear() + 1
          : today.getFullYear();
    const unlock = new Date(year, mm - 1, dd);
    unlock.setDate(unlock.getDate() + BIRTHDAY_SETTLE_DAYS);
    return {
      editable: false,
      unlockDate: unlock.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
      }),
    };
  }
  return { editable: true, unlockDate: null };
}
