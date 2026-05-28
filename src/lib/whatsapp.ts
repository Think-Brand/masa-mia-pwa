import { CarritoItem, Cliente } from "@/components/CarritoProvider";

// Ambos números de Masa Mía, con prefijo 521 (México)
const NUMBERS = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBERS ||
  "5218110050755,5218120148584")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

/**
 * Reparte la carga: pedidos con folio par van al primer número,
 * impares al segundo. Si hay 1 solo número, siempre ese.
 */
export function escogerDestino(folio: string): string {
  if (NUMBERS.length === 1) return NUMBERS[0];
  const num = parseInt(folio.replace(/\D/g, ""), 10) || 0;
  return NUMBERS[num % NUMBERS.length];
}

export function generarMensajeWhatsapp(opts: {
  cliente: Cliente;
  items: CarritoItem[];
  total: number;
  folio: string;
  metodoPago: "efectivo" | "transferencia";
  fechaEntrega?: string;
  notas?: string;
}) {
  const { cliente, items, total, folio, metodoPago, fechaEntrega, notas } =
    opts;

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
    fechaEntrega ? `📅 *Entrega:* ${fechaEntrega}` : "",
    notas ? `📝 *Notas:* ${notas}` : "",
    ``,
    `¡Gracias! Quedo en espera de confirmación.`,
  ]
    .filter(Boolean)
    .join("\n");

  const destino = escogerDestino(folio);
  return `https://wa.me/${destino}?text=${encodeURIComponent(cuerpo)}`;
}
