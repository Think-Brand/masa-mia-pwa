"use client";

import {
  IconChefHat,
  IconFlame,
  IconX,
  IconBox,
  IconHeart,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  buildProductionTally,
  type ItemLite,
} from "@/lib/productionPlan";

type OrderLite = {
  id: string;
  folio: string;
  pickup_date: string | null;
  pickup_time: string | null;
  status: string;
  customer: { name: string } | null;
  items: ItemLite[];
};

type Filtro = "hoy" | "manana" | "semana";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ProductionPlanDrawer({
  orders,
  onClose,
  cardBg,
  cardText,
  subText,
  surfaceBg,
}: {
  orders: OrderLite[];
  onClose: () => void;
  cardBg: string;
  cardText: string;
  subText: string;
  surfaceBg: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>("hoy");

  const filtered = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const inRange = (iso: string | null, from: Date, to: Date) => {
      if (!iso) return false;
      return iso >= isoDay(from) && iso < isoDay(to);
    };

    return orders
      .filter((o) => o.status !== "declined" && o.status !== "cancelled")
      .filter((o) => {
        if (filtro === "hoy") return inRange(o.pickup_date, today, tomorrow);
        if (filtro === "manana") {
          const next = new Date(tomorrow);
          next.setDate(tomorrow.getDate() + 1);
          return inRange(o.pickup_date, tomorrow, next);
        }
        return inRange(o.pickup_date, today, weekEnd);
      })
      .sort((a, b) =>
        (a.pickup_time ?? "99:99").localeCompare(b.pickup_time ?? "99:99")
      );
  }, [orders, filtro]);

  const tally = useMemo(() => {
    const allItems: ItemLite[] = [];
    for (const o of filtered) allItems.push(...o.items);
    return buildProductionTally(allItems);
  }, [filtered]);

  const filtroLabel = {
    hoy: "Hoy",
    manana: "Mañana",
    semana: "Próx. 7 días",
  }[filtro];

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[460px] ${cardBg} shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`flex items-center justify-between p-4 border-b border-current/10 ${cardText}`}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "Termina" }}
            >
              Plan de producción
            </h2>
            <p className={`text-xs ${subText}`}>
              Qué hornear para {filtroLabel.toLowerCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${surfaceBg} active:scale-90 transition`}
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </header>

        {/* Filtro hoy / mañana / 7 días */}
        <div
          className={`px-3 pt-3 pb-2 border-b border-current/10 ${cardText}`}
        >
          <div className="flex gap-1.5">
            {(["hoy", "manana", "semana"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`flex-1 px-2 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                  filtro === f
                    ? `${surfaceBg} shadow-sm`
                    : "opacity-60 hover:opacity-100"
                }`}
                style={{ fontFamily: "Termina" }}
              >
                {{ hoy: "Hoy", manana: "Mañana", semana: "7 días" }[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className={`text-center py-12 ${subText}`}>
              <IconChefHat size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm italic">Nada que hornear para {filtroLabel.toLowerCase()}.</p>
            </div>
          ) : (
            <>
              {/* Resumen ejecutivo */}
              <section
                className={`${surfaceBg} rounded-2xl p-3`}
              >
                <h3
                  className={`text-[11px] font-bold uppercase tracking-wider ${subText} mb-2`}
                  style={{ fontFamily: "Termina" }}
                >
                  Resumen
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCell
                    icon={<IconFlame size={18} />}
                    label="Roles"
                    value={tally.totalRoles}
                    cardText={cardText}
                    subText={subText}
                  />
                  <StatCell
                    icon={<IconHeart size={18} />}
                    label="Berlinesas"
                    value={tally.totalBerlinesas}
                    cardText={cardText}
                    subText={subText}
                  />
                  <StatCell
                    icon={<IconBox size={18} />}
                    label="RollinBox"
                    value={tally.rollinBoxCount}
                    cardText={cardText}
                    subText={subText}
                  />
                  <StatCell
                    icon={<IconBox size={18} />}
                    label="LuvinBox"
                    value={tally.luvinBoxCount}
                    cardText={cardText}
                    subText={subText}
                  />
                </div>
                <div
                  className={`text-[11px] ${subText} mt-2 italic leading-snug`}
                >
                  {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{" "}
                  en {filtroLabel.toLowerCase()}.
                </div>
              </section>

              {/* Breakdown roles */}
              {tally.rolesPorSabor.size > 0 && (
                <section className={`${surfaceBg} rounded-2xl p-3`}>
                  <h3
                    className={`text-[11px] font-bold uppercase tracking-wider ${subText} mb-2 flex items-center gap-1.5`}
                    style={{ fontFamily: "Termina" }}
                  >
                    <IconFlame size={13} /> Roles por sabor
                  </h3>
                  <ul className="space-y-1">
                    {[...tally.rolesPorSabor.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([sabor, qty]) => (
                        <SaborRow
                          key={sabor}
                          sabor={sabor}
                          qty={qty}
                          cardText={cardText}
                        />
                      ))}
                  </ul>
                </section>
              )}

              {/* Breakdown berlinesas */}
              {tally.berlinesasPorSabor.size > 0 && (
                <section className={`${surfaceBg} rounded-2xl p-3`}>
                  <h3
                    className={`text-[11px] font-bold uppercase tracking-wider ${subText} mb-2 flex items-center gap-1.5`}
                    style={{ fontFamily: "Termina" }}
                  >
                    <IconHeart size={13} /> Berlinesas por sabor
                  </h3>
                  <ul className="space-y-1">
                    {[...tally.berlinesasPorSabor.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([sabor, qty]) => (
                        <SaborRow
                          key={sabor}
                          sabor={sabor}
                          qty={qty}
                          cardText={cardText}
                        />
                      ))}
                  </ul>
                </section>
              )}

              {/* Lista de pedidos por hora */}
              <section className={`${surfaceBg} rounded-2xl p-3`}>
                <h3
                  className={`text-[11px] font-bold uppercase tracking-wider ${subText} mb-2`}
                  style={{ fontFamily: "Termina" }}
                >
                  Pedidos por hora
                </h3>
                <ul className="space-y-1.5">
                  {filtered.map((o) => (
                    <li
                      key={o.id}
                      className={`flex items-center gap-2 text-xs ${cardText}`}
                    >
                      <span
                        className="font-bold w-16 flex-shrink-0"
                        style={{ fontFamily: "Termina" }}
                      >
                        {o.pickup_time
                          ? (() => {
                              const [h, m] = o.pickup_time
                                .split(":")
                                .map(Number);
                              const period = h >= 12 ? "pm" : "am";
                              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                              return `${h12}:${String(m).padStart(2, "0")}${period}`;
                            })()
                          : "—"}
                      </span>
                      <span className="font-bold flex-shrink-0">
                        {o.folio}
                      </span>
                      <span className={`${subText} truncate`}>
                        {o.customer?.name ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  cardText,
  subText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  cardText: string;
  subText: string;
}) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2">
      <div className={`flex items-center gap-1.5 text-[11px] ${subText}`}>
        {icon} <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-2xl font-bold ${cardText} mt-0.5`}
        style={{ fontFamily: "ReginaBlack" }}
      >
        {value}
      </div>
    </div>
  );
}

function SaborRow({
  sabor,
  qty,
  cardText,
}: {
  sabor: string;
  qty: number;
  cardText: string;
}) {
  return (
    <li className={`flex items-center justify-between gap-3 text-sm ${cardText}`}>
      <span className="truncate">{sabor}</span>
      <span
        className="font-bold flex-shrink-0"
        style={{ fontFamily: "ReginaBlack" }}
      >
        {qty}
      </span>
    </li>
  );
}
