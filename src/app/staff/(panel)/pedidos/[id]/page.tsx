import Link from "next/link";
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconCheck,
  IconFlame,
  IconPackage,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ChangeStatusButton } from "./actions";
import { DeclineButton } from "./DeclineButton";

export const dynamic = "force-dynamic";

export default async function PedidoDetalle({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      `*, customer:customers(id, name, whatsapp)`
    )
    .eq("id", params.id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const { data: settings } = await supabase.from("settings").select("key, value");
  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) settingsMap[s.key] = s.value;

  const contactWa =
    order.contact_person === "alex"
      ? settingsMap.contact_alex_wa
      : settingsMap.contact_fabiola_wa;

  const customerWa = (order.customer as any)?.whatsapp;
  const customerName = (order.customer as any)?.name ?? "—";
  const customerWaUrl = customerWa
    ? `https://wa.me/521${customerWa}`
    : null;

  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pickup = order.pickup_date
    ? new Date(order.pickup_date + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <main className="px-4 pt-4">
      <Link
        href="/staff/pedidos"
        className="inline-flex items-center gap-1 text-xs text-canela mb-3"
      >
        <IconArrowLeft size={14} /> Volver
      </Link>

      <div className="flex items-baseline justify-between gap-2">
        <h1
          className="text-3xl text-cafe leading-none"
          style={{ fontFamily: "ReginaBlack" }}
        >
          {order.folio}
        </h1>
        <span className="text-[10px] uppercase tracking-widest text-canela font-bold">
          {order.status}
        </span>
      </div>

      {order.is_courtesy && (
        <div className="mt-3 bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl p-3 flex items-center gap-2 shadow-md">
          <span className="text-2xl">🎁</span>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">
              Cortesía piloto
            </div>
            <div className="text-sm font-bold" style={{ fontFamily: "Termina" }}>
              Código {order.pilot_code} · Sin cobro
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-canela mt-1 capitalize">{fecha}</p>

      {/* Cliente */}
      <section className="mt-5 bg-white rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-canela">
          Cliente
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <div>
            <div
              className="text-base font-bold text-cafe"
              style={{ fontFamily: "Termina" }}
            >
              {customerName}
            </div>
            {customerWa && (
              <div className="text-xs text-canela">
                {customerWa.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3")}
              </div>
            )}
          </div>
          {customerWaUrl && (
            <a
              href={customerWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1"
            >
              <IconBrandWhatsapp size={16} /> Mensaje
            </a>
          )}
        </div>
      </section>

      {/* Items */}
      <section className="mt-3 bg-white rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-canela mb-2">
          Pedido
        </div>
        <ul className="space-y-2">
          {(items ?? []).map((it: any) => {
            const [name, detail] = it.product_name.split(" [");
            return (
              <li key={it.id} className="text-sm text-cafe">
                <div className="flex justify-between gap-2">
                  <span>
                    <b>{it.quantity}×</b> {name}
                  </span>
                  <span className="font-bold">
                    ${Number(it.subtotal ?? it.unit_price * it.quantity).toFixed(0)}
                  </span>
                </div>
                {detail && (
                  <div className="text-[10px] text-canela italic pl-4">
                    {detail.replace(/\]$/, "")}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between mt-3 pt-3 border-t border-caramelo/30 items-baseline">
          <span className="text-xs text-canela">Total</span>
          <span
            className="text-xl text-[#F25C20]"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ${Number(order.total).toFixed(0)}
          </span>
        </div>
      </section>

      {/* Logística */}
      <section className="mt-3 bg-white rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-canela mb-2">
          Logística
        </div>
        <div className="text-sm text-cafe space-y-1.5">
          {pickup && (
            <div>
              📅 Recoger:{" "}
              <b className="capitalize">{pickup}</b>
            </div>
          )}
          {order.contact_person && (
            <div>
              👤 Atiende:{" "}
              <b className="capitalize">{order.contact_person}</b>
            </div>
          )}
          {order.payment_method && (
            <div>
              💰 Pago:{" "}
              <b className="capitalize">
                {order.payment_method === "transferencia"
                  ? "Transferencia BBVA"
                  : "Efectivo al recibir"}
              </b>
            </div>
          )}
          {order.notes && (
            <div className="text-canela italic text-xs mt-2 pl-1 border-l-2 border-caramelo">
              📝 {order.notes}
            </div>
          )}
        </div>

        {/* Si está declinado, mostrar motivo */}
        {order.status === "declined" && order.decline_reason && (
          <div className="mt-3 pt-3 border-t border-rojo/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rojo mb-1">
              Motivo de declinación
            </div>
            <div className="text-xs text-cafe capitalize">
              {order.decline_reason.replace(/_/g, " ")}
            </div>
            {order.decline_message && (
              <div className="text-xs text-canela italic mt-2 pl-2 border-l-2 border-rojo/30">
                💬 {order.decline_message}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Acciones */}
      <section className="mt-4 flex flex-col gap-2">
        {order.status === "pending" && (
          <>
            <ChangeStatusButton
              orderId={order.id}
              newStatus="accepted"
              label="Aceptar pedido"
              tone="verde"
              icon="check"
            />
            <DeclineButton orderId={order.id} customerName={customerName} />
          </>
        )}
        {order.status === "accepted" && (
          <ChangeStatusButton
            orderId={order.id}
            newStatus="baking"
            label="Meter al horno 🔥"
            tone="antojo"
            icon="flame"
          />
        )}
        {order.status === "baking" && (
          <ChangeStatusButton
            orderId={order.id}
            newStatus="delivered"
            label="Marcar entregado"
            tone="cafe"
            icon="package"
          />
        )}
      </section>
    </main>
  );
}
