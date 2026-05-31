/**
 * Helpers para notificaciones del cliente (campanita in-app).
 */

export type Notification = {
  id: string;
  customer_id: string;
  type: string;
  title: string;
  body: string | null;
  emoji: string | null;
  link: string | null;
  read: boolean;
  read_at: string | null;
  related_order_id: string | null;
  created_at: string;
};

/** Formato de tiempo relativo en español */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return "ahora";
  if (diffMin < 1) return `hace ${diffSec}s`;
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHr < 24)
    return diffHr === 1 ? "hace 1 h" : `hace ${diffHr} h`;
  if (diffDay < 7) return diffDay === 1 ? "ayer" : `hace ${diffDay} días`;

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

/** Agrupar notificaciones por día relativo */
export function groupByDay(notifs: Notification[]): {
  label: string;
  items: Notification[];
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    Hoy: [],
    Ayer: [],
    "Esta semana": [],
    "Más atrás": [],
  };

  for (const n of notifs) {
    const d = new Date(n.created_at);
    const dDay = new Date(d);
    dDay.setHours(0, 0, 0, 0);
    if (dDay.getTime() === today.getTime()) groups.Hoy.push(n);
    else if (dDay.getTime() === yesterday.getTime()) groups.Ayer.push(n);
    else if (dDay >= weekAgo) groups["Esta semana"].push(n);
    else groups["Más atrás"].push(n);
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
