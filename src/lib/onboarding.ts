/**
 * Sistema de tours interactivos con Miga.
 * Solo se muestran cuando pilot_mode está activo Y el usuario no completó el tour.
 *
 * Si quieres re-mostrar un tour después de un cambio importante, sube el sufijo
 * de versión del ID (ej: "staff-v1" → "staff-v2").
 */

export const STAFF_TOUR_ID = "staff-v1";
export const CLIENTE_TOUR_ID = "cliente-v1";

const STORAGE_KEY = "masamia:onboarding:completed";

export function isTourCompleted(tourId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(done) && done.includes(tourId);
  } catch {
    return false;
  }
}

export function markTourCompleted(tourId: string) {
  if (typeof window === "undefined") return;
  try {
    const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const list = Array.isArray(done) ? done : [];
    if (!list.includes(tourId)) list.push(tourId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/** Reinicia un tour (para botón "ver de nuevo" o testing) */
export function resetTour(tourId: string) {
  if (typeof window === "undefined") return;
  try {
    const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const list = Array.isArray(done) ? done : [];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.filter((id: string) => id !== tourId))
    );
  } catch {}
}

/** Reinicia TODOS los tours */
export function resetAllTours() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
