import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconCake,
  IconCrown,
  IconReceipt2,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase-server";
import ClienteEditor from "./ClienteEditor";

export const dynamic = "force-dynamic";

const POSES: Record<string, string> = {
  adorable: "/mascota/miga-adorable.png",
  tierna: "/mascota/miga-tierna.png",
  lista: "/mascota/miga-lista.png",
  senalar: "/mascota/miga-senalar.png",
  chef: "/mascota/miga-chef.png",
  sentada: "/mascota/miga-sentada.png",
  cintura: "/mascota/miga-cintura.png",
  espalda: "/mascota/miga-espalda.png",
  malabares: "/mascota/miga-malabares.png",
  algo_entre_manos: "/mascota/miga-algo-entre-manos.png",
};

function avatarFor(pose: string | null): string {
  const p = (pose || "adorable").toLowerCase();
  return POSES[p] ?? POSES.adorable;
}

function formatBirthday(bMD: string | null): string {
  if (!bMD) return "Sin fecha";
  const [m, d] = bMD.split("-").map((x) => parseInt(x, 10));
  const months = [
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
  return `${d} de ${months[m - 1]}`;
}

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = daysSince(iso);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} semanas`;
  if (d < 365) return `hace ${Math.floor(d / 30)} meses`;
  return `hace ${Math.floor(d / 365)} años`;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-[#F25C20] text-white" },
  accepted: { label: "Aceptado", color: "bg-verde text-white" },
  baking: { label: "En horno", color: "bg-antojo text-white" },
  ready: { label: "Listo", color: "bg-cafe text-crema" },
  delivered: { label: "Entregado", color: "bg-canela text-white" },
  declined: { label: "Declinado", color: "bg-rojo text-white" },
  cancelled: { label: "Cancelado", color: "bg-canela/40 text-cafe" },
};

export default async function ClienteDetalle({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: cliente } = await supabase
    .from("customers")
    .select(
      `id, name, whatsapp, email, notes, total_orders, total_spent,
       first_order_at, last_order_at, created_at, avatar_pose, birthday,
       received_welcome_courtesy`
    )
    .eq("id", params.id)
    .single();

  if (!cliente) notFound();

  const { data: pedidos } = await supabase
    .from("orders")
    .select(
      `id, folio, status, total, payment_method, pickup_date, created_at,
       is_courtesy, is_birthday_treat, is_welcome_courtesy`
    )
    .eq("customer_id", cliente.id)
    .order("created_at", { ascending: false });

  const lapsoDias = cliente.last_order_at
    ? daysSince(cliente.last_order_at)
    : null;

  return (
    <main className="px-4 pt-4 pb-12 max-w-2xl mx-auto">
      <Link
        href="/staff/clientes"
        className="inline-flex items-center gap-1 text-xs text-canela mb-3 active:scale-95 transition"
      >
        <IconArrowLeft size={14} />
        Clientes
      </Link>

      {/* Header del cliente */}
      <header className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-crema-soft flex-shrink-0 flex items-center justify-center overflow-hidden">
          <Image
            src={avatarFor(cliente.avatar_pose)}
            alt=""
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="text-2xl text-cafe leading-none"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {cliente.name}
          </h1>
          <p className="text-xs text-canela mt-0.5">
            📱 {cliente.whatsapp}
            {cliente.email ? ` · ${cliente.email}` : ""}
          </p>
          <p className="text-xs text-canela">
            <IconCake size={12} className="inline -mt-0.5" />{" "}
            {formatBirthday(cliente.birthday)}
          </p>
        </div>
        <a
          href={`https://wa.me/521${cliente.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="w-10 h-10 rounded-full bg-verde text-white flex items-center justify-center active:scale-90 transition flex-shrink-0"
          title="Mandar WhatsApp"
        >
          <IconBrandWhatsapp size={18} />
        </a>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat
          label="Pedidos"
          value={String(cliente.total_orders ?? 0)}
          icon={<IconReceipt2 size={14} />}
        />
        <Stat
          label="Gastado"
          value={`$${Number(cliente.total_spent ?? 0).toFixed(0)}`}
          icon={<IconCrown size={14} />}
        />
        <Stat
          label="Último"
          value={relativeDate(cliente.last_order_at)}
          icon={<IconCake size={14} />}
        />
      </div>

      {lapsoDias !== null && lapsoDias > 30 && (
        <div className="mt-3 bg-canela/15 border border-canela/30 rounded-xl p-3 text-xs text-cafe">
          ⏳ Lleva <b>{lapsoDias} días</b> sin pedir. ¿Le mandas un mensajito de
          antojo?
        </div>
      )}

      {/* Editor de datos */}
      <ClienteEditor
        clienteId={cliente.id}
        notesInicial={cliente.notes ?? ""}
        birthdayInicial={cliente.birthday ?? ""}
        avatarPoseInicial={cliente.avatar_pose ?? "adorable"}
      />

      {/* Historial de pedidos */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-canela mb-2">
          📜 Historial completo ({pedidos?.length ?? 0})
        </h2>
        {!pedidos || pedidos.length === 0 ? (
          <p className="text-xs text-canela italic px-3 py-2 bg-white/50 rounded-xl">
            Aún no pide nada. Lo bueno es que apenas empieza.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pedidos.map((p: any) => {
              const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.pending;
              const fecha = new Date(p.created_at).toLocaleString("es-MX", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <Link
                  key={p.id}
                  href={`/staff/pedidos/${p.id}`}
                  className="bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.is_birthday_treat && (
                        <span title="Cumpleaños">🎂</span>
                      )}
                      {p.is_welcome_courtesy && !p.is_birthday_treat && (
                        <span title="Bienvenida">🎁</span>
                      )}
                      <span
                        className="text-sm font-bold text-cafe"
                        style={{ fontFamily: "Termina" }}
                      >
                        {p.folio}
                      </span>
                    </div>
                    <div className="text-[11px] text-canela">{fecha}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status.color}`}
                    >
                      {status.label}
                    </span>
                    <span
                      className="text-sm text-[#F25C20] font-bold"
                      style={{ fontFamily: "Termina" }}
                    >
                      ${Number(p.total).toFixed(0)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-1 text-canela">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div
        className="text-base font-bold text-cafe mt-1 leading-tight"
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
    </div>
  );
}
