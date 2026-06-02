"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconBrandWhatsapp,
  IconCake,
  IconCrown,
  IconMoodEmpty,
  IconSearch,
  IconSparkles,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  notes: string | null;
  total_orders: number | null;
  total_spent: number | null;
  first_order_at: string | null;
  last_order_at: string | null;
  created_at: string | null;
  avatar_pose: string | null;
  birthday: string | null; // 'MM-DD'
  received_welcome_courtesy: boolean | null;
};

type Filter = "todos" | "cumple_mes" | "vip" | "lapsos" | "nuevos";

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

function avatarFor(c: Customer): string {
  const pose = (c.avatar_pose || "adorable").toLowerCase();
  return POSES[pose] ?? POSES.adorable;
}

function birthdayThisMonth(bMD: string | null): boolean {
  if (!bMD) return false;
  const [m] = bMD.split("-");
  const now = new Date();
  return parseInt(m, 10) === now.getMonth() + 1;
}

function birthdayThisWeek(bMD: string | null): boolean {
  if (!bMD) return false;
  const [m, d] = bMD.split("-").map((x) => parseInt(x, 10));
  const now = new Date();
  const y = now.getFullYear();
  const bDate = new Date(y, m - 1, d);
  const diff = (bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -1 && diff <= 7;
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
  if (d < 7) return `hace ${d}d`;
  if (d < 30) return `hace ${Math.floor(d / 7)}sem`;
  if (d < 365) return `hace ${Math.floor(d / 30)}m`;
  return `hace ${Math.floor(d / 365)}a`;
}

function formatBirthday(bMD: string | null): string {
  if (!bMD) return "—";
  const [m, d] = bMD.split("-").map((x) => parseInt(x, 10));
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${d} ${months[m - 1]}`;
}

export default function ClientesList({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  // VIP = top 20% por total_spent (mínimo 2 pedidos)
  const vipThreshold = useMemo(() => {
    const withOrders = initialCustomers.filter(
      (c) => (c.total_orders ?? 0) >= 2
    );
    const sorted = [...withOrders].sort(
      (a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0)
    );
    const top20Index = Math.max(0, Math.floor(sorted.length * 0.2) - 1);
    return sorted[top20Index]?.total_spent ?? Infinity;
  }, [initialCustomers]);

  const filtered = useMemo(() => {
    let list = initialCustomers;

    // Filtros
    if (filter === "cumple_mes") {
      list = list.filter((c) => birthdayThisMonth(c.birthday));
    } else if (filter === "vip") {
      list = list.filter(
        (c) =>
          (c.total_spent ?? 0) >= vipThreshold && (c.total_orders ?? 0) >= 2
      );
    } else if (filter === "lapsos") {
      list = list.filter((c) => {
        if (!c.last_order_at) return false;
        return daysSince(c.last_order_at) > 30;
      });
    } else if (filter === "nuevos") {
      list = list.filter((c) => (c.total_orders ?? 0) <= 1);
    }

    // Búsqueda
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.whatsapp.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialCustomers, filter, search, vipThreshold]);

  const counts = useMemo(
    () => ({
      todos: initialCustomers.length,
      cumple_mes: initialCustomers.filter((c) => birthdayThisMonth(c.birthday))
        .length,
      vip: initialCustomers.filter(
        (c) =>
          (c.total_spent ?? 0) >= vipThreshold && (c.total_orders ?? 0) >= 2
      ).length,
      lapsos: initialCustomers.filter((c) => {
        if (!c.last_order_at) return false;
        return daysSince(c.last_order_at) > 30;
      }).length,
      nuevos: initialCustomers.filter((c) => (c.total_orders ?? 0) <= 1).length,
    }),
    [initialCustomers, vipThreshold]
  );

  return (
    <main className="px-4 pt-4 max-w-2xl mx-auto">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Clientes
      </h1>
      <p className="text-xs text-canela mt-1">
        Quién te compra, qué le gusta, cuándo cumple. Aquí vive la memoria.
      </p>

      {/* Búsqueda */}
      <div className="mt-4 relative">
        <IconSearch
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-canela"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, WhatsApp o email…"
          className="w-full bg-white rounded-xl pl-9 pr-9 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-canela active:scale-90 transition"
            aria-label="Limpiar"
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <FilterPill
          active={filter === "todos"}
          onClick={() => setFilter("todos")}
          icon={<IconUsers size={13} />}
          count={counts.todos}
        >
          Todos
        </FilterPill>
        <FilterPill
          active={filter === "cumple_mes"}
          onClick={() => setFilter("cumple_mes")}
          icon={<IconCake size={13} />}
          count={counts.cumple_mes}
          tone="rosa"
        >
          Cumple del mes
        </FilterPill>
        <FilterPill
          active={filter === "vip"}
          onClick={() => setFilter("vip")}
          icon={<IconCrown size={13} />}
          count={counts.vip}
          tone="dorado"
        >
          VIP
        </FilterPill>
        <FilterPill
          active={filter === "lapsos"}
          onClick={() => setFilter("lapsos")}
          icon={<IconMoodEmpty size={13} />}
          count={counts.lapsos}
          tone="rojo"
        >
          Lapsos
        </FilterPill>
        <FilterPill
          active={filter === "nuevos"}
          onClick={() => setFilter("nuevos")}
          icon={<IconSparkles size={13} />}
          count={counts.nuevos}
          tone="verde"
        >
          Nuevos
        </FilterPill>
      </div>

      {/* Lista */}
      <div className="mt-4 flex flex-col gap-2 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-canela">
            <IconUsers size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm italic">
              {search
                ? "Nadie con ese nombre."
                : filter === "cumple_mes"
                ? "Nadie cumple este mes."
                : filter === "vip"
                ? "Aún sin clientes VIP."
                : filter === "lapsos"
                ? "Nadie en lapsos. ¡Bien!"
                : filter === "nuevos"
                ? "Sin nuevos por ahora."
                : "Sin clientes registrados."}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <CustomerCard key={c.id} customer={c} vipThreshold={vipThreshold} />
          ))
        )}
      </div>
    </main>
  );
}

function CustomerCard({
  customer: c,
  vipThreshold,
}: {
  customer: Customer;
  vipThreshold: number;
}) {
  const isBdayWeek = birthdayThisWeek(c.birthday);
  const isVip =
    (c.total_spent ?? 0) >= vipThreshold && (c.total_orders ?? 0) >= 2;
  const isNew = (c.total_orders ?? 0) <= 1;
  const isLapsed = c.last_order_at && daysSince(c.last_order_at) > 30;

  return (
    <Link
      href={`/staff/clientes/${c.id}`}
      className="bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition flex items-center gap-3"
    >
      <div className="w-12 h-12 rounded-full bg-crema-soft flex-shrink-0 flex items-center justify-center overflow-hidden">
        <Image
          src={avatarFor(c)}
          alt=""
          width={48}
          height={48}
          className="w-12 h-12 object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-sm font-bold text-cafe truncate"
            style={{ fontFamily: "Termina" }}
          >
            {c.name}
          </span>
          {isVip && (
            <span title="VIP" className="text-xs">
              👑
            </span>
          )}
          {isBdayWeek && (
            <span
              className="text-[11px] font-bold uppercase tracking-wider bg-[#FFD9E5] text-rojo px-1.5 py-0.5 rounded-full"
              title={`Cumple ${formatBirthday(c.birthday)}`}
            >
              🎂 Cumple
            </span>
          )}
          {isNew && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-verde/15 text-verde px-1.5 py-0.5 rounded-full">
              Nuevo
            </span>
          )}
          {isLapsed && !isBdayWeek && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-canela/20 text-canela px-1.5 py-0.5 rounded-full">
              Lapso
            </span>
          )}
        </div>
        <div className="text-[11px] text-canela truncate">
          📱 {c.whatsapp} · 🎂 {formatBirthday(c.birthday)}
        </div>
        <div className="text-[11px] text-canela">
          {c.total_orders ?? 0} pedido{(c.total_orders ?? 0) === 1 ? "" : "s"} ·
          ${Number(c.total_spent ?? 0).toFixed(0)} · último{" "}
          {relativeDate(c.last_order_at)}
        </div>
      </div>
      <a
        href={`https://wa.me/521${c.whatsapp}`}
        onClick={(e) => e.stopPropagation()}
        target="_blank"
        rel="noreferrer"
        className="w-9 h-9 rounded-full bg-verde text-white flex items-center justify-center active:scale-90 transition flex-shrink-0"
        title="Mandar WhatsApp"
      >
        <IconBrandWhatsapp size={18} />
      </a>
    </Link>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  icon,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
  count: number;
  tone?: "rosa" | "dorado" | "rojo" | "verde";
}) {
  const toneCls = {
    rosa: "bg-[#FFD9E5] text-rojo",
    dorado: "bg-[#F4B84D] text-cafe",
    rojo: "bg-rojo text-white",
    verde: "bg-verde text-white",
  };
  const activeCls = tone ? toneCls[tone] : "bg-cafe text-crema";
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 ${
        active ? activeCls + " shadow-sm" : "bg-white text-cafe opacity-80"
      }`}
      style={{ fontFamily: "Termina" }}
    >
      {icon}
      <span className="uppercase tracking-wider">{children}</span>
      <span
        className={`text-[11px] px-1.5 rounded-full ${
          active ? "bg-black/20" : "bg-canela/20"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
