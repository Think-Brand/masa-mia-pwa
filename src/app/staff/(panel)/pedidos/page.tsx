import { redirect } from "next/navigation";

/**
 * /staff/pedidos ya no existe como sección propia.
 * Toda la operación de pedidos vive en /staff/cocina (kanban + drawer histórico).
 * La vista de detalle /staff/pedidos/[id] sigue activa (es a donde apunta cada card).
 */
export default function PedidosLegacyRedirect() {
  redirect("/staff/cocina");
}
