import { CarritoItem, Cliente } from "@/components/CarritoProvider";

export function generarMensajeWhatsapp(opts: {
  cliente: Cliente;
  items: CarritoItem[];
  total: number;
  folio: string;
  metodoPago: "efectivo" | "transferencia";
  fechaEntrega?: string;
  notas?: string;
  destinoWa: string; // número con 521xxx
}) {
  const {
    cliente,
    items,
    total,
    folio,
    metodoPago,
    fechaEntrega,
    notas,
    destinoWa,
  } = opts;

  const lineas = items
    .map(
      (it) =>
        `• ${it.quantity}× ${it.name} = $${(it.price * it.quantity).toFixed(2)}`
    )
    .join("\n");

  const pago =
    metodoPago === "transferencia"
      ? "💳 Transferencia (mando comprobante)"
      : "💵 Efectivo al recibir";

  const cuerpo = [
    `¡Hola Masa Mía! 🥖`,
    ``,
    `Soy *${cliente.name}*. Acabo de hacer este pedido desde la app:`,
    ``,
    `📋 *Folio:* ${folio}`,
    ``,
    lineas,
    ``,
    `💰 *Total:* $${total.toFixed(2)}`,
    pago,
    fechaEntrega ? `📅 *Recojo:* ${fechaEntrega}` : "",
    notas ? `📝 *Notas:* ${notas}` : "",
    ``,
    `¡Gracias! Quedo en espera de confirmación.`,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${destinoWa}?text=${encodeURIComponent(cuerpo)}`;
}
