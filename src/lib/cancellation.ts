/**
 * Helpers para cancelación de pedidos por parte del cliente.
 * Regla: solo si status es pending/accepted AND faltan >= 24h para pickup.
 */

export const MIN_HOURS_TO_CANCEL = 24;

export type CancelEligibility =
  | { canCancel: true; hoursToPickup: number }
  | { canCancel: false; reason: string; hoursToPickup: number };

export function checkCancelEligibility(args: {
  status: string;
  pickup_date: string | null;
}): CancelEligibility {
  const { status, pickup_date } = args;

  // Status que NO permite cancelación
  const cancellableStatuses = ["pending", "accepted"];
  if (!cancellableStatuses.includes(status)) {
    const labels: Record<string, string> = {
      baking: "ya está en el horno",
      ready: "ya está listo para recoger",
      delivered: "ya fue entregado",
      declined: "ya fue declinado",
      cancelled: "ya fue cancelado",
    };
    return {
      canCancel: false,
      hoursToPickup: 0,
      reason: `Este pedido ${labels[status] ?? "no puede cancelarse"}`,
    };
  }

  if (!pickup_date) {
    return {
      canCancel: false,
      hoursToPickup: 0,
      reason: "Sin fecha de entrega, contáctanos por WhatsApp",
    };
  }

  // Pickup_date está en formato YYYY-MM-DD, asumir entrega a las 12:00 del día
  const pickup = new Date(pickup_date + "T12:00:00");
  const now = new Date();
  const diffMs = pickup.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < MIN_HOURS_TO_CANCEL) {
    return {
      canCancel: false,
      hoursToPickup: hours,
      reason:
        hours < 0
          ? "La fecha de entrega ya pasó"
          : `Faltan menos de ${MIN_HOURS_TO_CANCEL}h para tu entrega. Si necesitas cancelar, escríbenos por WhatsApp.`,
    };
  }

  return { canCancel: true, hoursToPickup: hours };
}
