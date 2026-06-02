import Link from "next/link";
import { IconReceipt2 } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase-server";
import PedidosRealtime from "@/components/PedidosRealtime";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  folio: string;
  status: string;
  total: number;
  payment_method: string | null;
  contact_person: string | null;
  pickup_date: string | null;
  created_at: string;
  is_courtesy: boolean | null;
  is_birthday_treat: boolean | null;
  is_welcome_courtesy: boolean | null;
  customer: { name: string; whatsapp: string } | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-[#F25C20] text-white" },
  accepted: { label: "Aceptado", color: "bg-verde text-white" },
  baking: { label: "En horno", color: "bg-antojo text-white" },
  ready: { label: "Listo", color: "bg-cafe text-crema" },
  delivered: { label: "Entregado", color: "bg-canela text-white" },
  declined: { label: "Declinado", color: "bg-rojo text-white" },
  cancelled: { label: "Cancelado", color: "bg-canela/40 text-cafe" },
};

export default async function PedidosPage() {
  const supabase = createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `id, folio, status, total, payment_method, contact_person,
       pickup_date, created_at, is_courtesy, is_birthday_treat, is_welcome_courtesy,
       customer:customers(name, whatsapp)`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (orders ?? []) as unknown as OrderRow[];

  const grouped = {
    pending: rows.filter((o) => o.status === "pending"),
    accepted: rows.filter((o) => o.status === "accepted"),
    baking: rows.filter((o) => o.status === "baking"),
    ready: rows.filter((o) => o.status === "ready"),
    delivered: rows.filter((o) => o.status === "delivered"),
    declined: rows.filter(
      (o) => o.status === "declined" || o.status === "cancelled"
    ),
  };

  return (
    <main className="px-4 pt-4">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Pedidos
      </h1>
      <p className="text-xs text-canela mt-1">
        Aquí caen los antojos. Conforme avanzan, los mueves.
      </p>

      <PedidosRealtime initialPendingCount={grouped.pending.length} />

      {error && (
        <div className="mt-4 text-xs text-rojo bg-rojo/10 rounded-xl p-3">
          Error al cargar: {error.message}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <Stat
          label="Pendientes"
          value={grouped.pending.length}
          highlight={grouped.pending.length > 0}
        />
        <Stat label="Aceptados" value={grouped.accepted.length} />
        <Stat label="En horno" value={grouped.baking.length} />
        <Stat label="Entregados" value={grouped.delivered.length} />
      </div>

      {/* Listas */}
      <div className="mt-6 flex flex-col gap-6">
        <Group
          title="🟡 Pendientes — acción"
          rows={grouped.pending}
          tone="alert"
        />
        <Group title="🟢 Aceptados" rows={grouped.accepted} />
        <Group title="🔥 En el horno" rows={grouped.baking} />
        <Group title="✨ Listos para entrega" rows={grouped.ready} />
        {grouped.delivered.length > 0 && (
          <Group title="✅ Entregados (últimos)" rows={grouped.delivered.slice(0, 10)} />
        )}
        {grouped.declined.length > 0 && (
          <Group
            title="❌ Declinados / Cancelados"
            rows={grouped.declined.slice(0, 10)}
          />
        )}

        {rows.length === 0 && (
          <div className="text-center py-12 text-canela">
            <IconReceipt2 size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Sin pedidos todavía.</p>
            <p className="text-xs text-caramelo italic mt-1">
              Cuando entre uno, va a aparecer aquí en tiempo real.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl p-2 text-center shadow-sm ${
        highlight ? "ring-2 ring-antojo" : ""
      }`}
    >
      <div
        className={`text-lg font-bold ${highlight ? "text-antojo" : "text-cafe"}`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[9px] text-canela leading-tight">{label}</div>
    </div>
  );
}

function Group({
  title,
  rows,
  tone = "normal",
}: {
  title: string;
  rows: OrderRow[];
  tone?: "normal" | "alert";
}) {
  if (rows.length === 0 && tone !== "alert") return null;
  return (
    <section>
      <h2
        className={`text-xs font-bold uppercase tracking-widest mb-2 ${
          tone === "alert" ? "text-antojo" : "text-canela"
        }`}
      >
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-canela italic px-3 py-2 bg-white/50 rounded-xl">
          Nada por aquí ahora.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const status = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending;
  const fecha = new Date(order.created_at).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Link
      href={`/staff/pedidos/${order.id}`}
      className="bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {order.is_birthday_treat && (
            <span title="Cumpleaños del cliente" className="text-base">
              🎂
            </span>
          )}
          {order.is_welcome_courtesy && !order.is_birthday_treat && (
            <span title="Cortesía de bienvenida" className="text-base">
              🎁
            </span>
          )}
          {order.is_courtesy &&
            !order.is_birthday_treat &&
            !order.is_welcome_courtesy && (
              <span title="Cortesía piloto (código)" className="text-base">
                🎁
              </span>
            )}
          <span
            className="text-sm font-bold text-cafe"
            style={{ fontFamily: "Termina" }}
          >
            {order.folio}
          </span>
          <span
            className="text-xs text-canela truncate"
            style={{ fontFamily: "Termina" }}
          >
            · {order.customer?.name || "—"}
          </span>
        </div>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status.color}`}
        >
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-canela">
        <span>{fecha}</span>
        <span
          className="text-sm text-[#F25C20] font-bold"
          style={{ fontFamily: "Termina" }}
        >
          ${Number(order.total).toFixed(0)}
        </span>
      </div>
      {order.contact_person && (
        <div className="text-[10px] text-canela">
          Para{" "}
          <span className="capitalize font-bold text-cafe">
            {order.contact_person}
          </span>
          {order.pickup_date && (
            <>
              {" · recoger "}
              <span className="text-cafe font-bold">
                {new Date(order.pickup_date + "T12:00:00").toLocaleDateString(
                  "es-MX",
                  {
                    day: "numeric",
                    month: "short",
                  }
                )}
              </span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}
