"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconFilter,
  IconFlame,
  IconLoader2,
  IconMaximize,
  IconPackage,
  IconRefresh,
  IconSun,
  IconMoon,
  IconVolume,
  IconBellOff,
  IconBell,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type OrderRow = {
  id: string;
  folio: string;
  status: "pending" | "accepted" | "baking";
  total: number;
  payment_method: string | null;
  contact_person: string | null;
  pickup_date: string | null;
  created_at: string;
  accepted_at: string | null;
  baking_started_at: string | null;
  notes: string | null;
  is_courtesy: boolean | null;
  is_birthday_treat: boolean | null;
  is_welcome_courtesy: boolean | null;
  customer: { name: string; whatsapp: string } | null;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
};

type Filter = "todos" | "pending" | "accepted" | "baking";
type Theme = "light" | "dark";

const SOUND_KEY = "masamia:kds:sound";
const THEME_KEY = "masamia:kds:theme";

function playBell() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, dur: 0.25 },
      { freq: 1318.5, start: 0.12, dur: 0.4 },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

/**
 * Formatea minutos a un string humano:
 *  - <60min  → "45 min"
 *  - <24h    → "2h 15min"  (omite los minutos si son 0)
 *  - >=24h   → "3 días" / "1d 4h"
 */
function formatElapsed(mins: number): string {
  if (mins < 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }
  const days = Math.floor(mins / (60 * 24));
  const remH = Math.floor((mins % (60 * 24)) / 60);
  return remH === 0 ? `${days}d` : `${days}d ${remH}h`;
}

/**
 * Devuelve el ISO timestamp desde el cual debemos contar tiempo,
 * según la fase actual del pedido. Cae en created_at si no hay
 * timestamp de fase (compatibilidad con pedidos viejos).
 */
function phaseStartIso(o: OrderRow): string {
  if (o.status === "baking") return o.baking_started_at ?? o.accepted_at ?? o.created_at;
  if (o.status === "accepted") return o.accepted_at ?? o.created_at;
  return o.created_at;
}

/**
 * Color de urgencia con umbrales por fase:
 *  - pending  : staff debería responder en <15min
 *  - accepted : margen amplio (puede estar en cola)
 *  - baking   : crítico — los roles se queman pasados ~25min
 */
function urgencyColor(o: OrderRow, mins: number, _theme: Theme) {
  if (o.status === "baking") {
    if (mins < 15) return "border-verde";
    if (mins < 25) return "border-[#F4B84D]";
    return "border-rojo";
  }
  if (o.status === "pending") {
    if (mins < 5) return "border-verde";
    if (mins < 15) return "border-[#F4B84D]";
    return "border-rojo";
  }
  // accepted
  if (mins < 30) return "border-verde";
  if (mins < 90) return "border-[#F4B84D]";
  return "border-rojo";
}

function phaseTimerLabel(status: OrderRow["status"]): string {
  if (status === "pending") return "esperando";
  if (status === "accepted") return "en cola";
  return "en horno";
}

function statusLabel(s: OrderRow["status"]) {
  if (s === "pending") return "Pendiente";
  if (s === "accepted") return "Aceptado";
  if (s === "baking") return "En el horno";
  return s;
}

function statusEmoji(s: OrderRow["status"]) {
  if (s === "pending") return "🟡";
  if (s === "accepted") return "🟢";
  if (s === "baking") return "🔥";
  return "";
}

export default function KitchenDisplay({
  initialOrders,
}: {
  initialOrders: OrderRow[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [filter, setFilter] = useState<Filter>("todos");
  const [theme, setTheme] = useState<Theme>("light");
  const [soundOn, setSoundOn] = useState(true);
  const [tick, setTick] = useState(0); // forzar re-render para tiempo transcurrido
  const [updating, setUpdating] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Cargar preferencias
  useEffect(() => {
    try {
      const s = localStorage.getItem(SOUND_KEY);
      if (s !== null) setSoundOn(s === "1");
      const t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") setTheme(t);
    } catch {}
  }, []);

  // Guardar preferencias
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    } catch {}
  }, [soundOn]);
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // Tick cada 30s para actualizar minutos transcurridos
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Wake lock: pantalla siempre activa
  useEffect(() => {
    let cancelled = false;
    const req = async () => {
      try {
        if ("wakeLock" in navigator) {
          const wl = await (navigator as any).wakeLock.request("screen");
          if (cancelled) {
            wl.release();
            return;
          }
          wakeLockRef.current = wl;
          wl.addEventListener("release", () => {
            // Re-request si se libera
            if (document.visibilityState === "visible") req();
          });
        }
      } catch {}
    };
    req();
    const onVis = () => {
      if (document.visibilityState === "visible") req();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
      }
    };
  }, []);

  // Realtime: nuevos pedidos + cambios
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          if (soundOn) playBell();
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          router.refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundOn, router]);

  // Sincronizar cuando lleguen nuevos initialOrders
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const advance = async (
    orderId: string,
    nextStatus: "accepted" | "baking" | "delivered"
  ) => {
    setUpdating(orderId);
    const supabase = createClient();
    const update: Record<string, any> = { status: nextStatus };
    if (nextStatus === "accepted")
      update.accepted_at = new Date().toISOString();
    if (nextStatus === "baking")
      update.baking_started_at = new Date().toISOString();
    if (nextStatus === "delivered")
      update.delivered_at = new Date().toISOString();
    await supabase.from("orders").update(update).eq("id", orderId);
    setUpdating(null);
    router.refresh();
  };

  const filtered =
    filter === "todos"
      ? orders
      : orders.filter((o) => o.status === filter);

  const bgClass =
    theme === "dark"
      ? "bg-cafe text-crema"
      : "bg-crema-soft text-cafe";
  const cardBg = theme === "dark" ? "bg-canela" : "bg-white";
  const cardText = theme === "dark" ? "text-crema" : "text-cafe";
  const subText = theme === "dark" ? "text-caramelo" : "text-canela";

  return (
    <div className={`min-h-screen ${bgClass} -mt-0 transition-colors`}>
      {/* Top controls */}
      <div className="sticky top-[88px] z-20 backdrop-blur" style={{ background: theme === 'dark' ? 'rgba(58,39,29,0.92)' : 'rgba(251,244,230,0.92)' }}>
        <div className="px-3 lg:px-4 py-1.5 lg:py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FilterChip active={filter === "todos"} onClick={() => setFilter("todos")} theme={theme}>
              Todos ({orders.length})
            </FilterChip>
            <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} theme={theme}>
              🟡 {orders.filter(o => o.status === "pending").length}
            </FilterChip>
            <FilterChip active={filter === "accepted"} onClick={() => setFilter("accepted")} theme={theme}>
              🟢 {orders.filter(o => o.status === "accepted").length}
            </FilterChip>
            <FilterChip active={filter === "baking"} onClick={() => setFilter("baking")} theme={theme}>
              🔥 {orders.filter(o => o.status === "baking").length}
            </FilterChip>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              onClick={() => playBell()}
              theme={theme}
              title="Probar sonido"
            >
              <IconVolume size={18} />
            </IconButton>
            <IconButton
              onClick={() => setSoundOn(v => !v)}
              theme={theme}
              title={soundOn ? "Desactivar sonido" : "Activar sonido"}
            >
              {soundOn ? <IconBell size={18} /> : <IconBellOff size={18} />}
            </IconButton>
            <IconButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              theme={theme}
              title="Cambiar tema"
            >
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </IconButton>
            <IconButton
              onClick={() => router.refresh()}
              theme={theme}
              title="Refrescar"
            >
              <IconRefresh size={18} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="p-3 lg:p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-3">🧑‍🍳</div>
            <p className="text-lg font-bold" style={{ fontFamily: "Termina" }}>
              Sin pedidos por ahora.
            </p>
            <p className={`text-sm mt-1 italic ${subText}`}>
              Cuando entre uno, va a sonar y aparecer aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6 gap-3 lg:gap-4">
            {filtered.map((o) => {
              const mins = minutesAgo(phaseStartIso(o));
              const borderColor = urgencyColor(o, mins, theme);
              const isUpdating = updating === o.id;
              return (
                <article
                  key={o.id}
                  className={`${cardBg} rounded-2xl shadow-lg p-3 lg:p-4 flex flex-col gap-2.5 lg:gap-3 border-l-8 ${borderColor} transition overflow-hidden`}
                >
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-2xl lg:text-3xl font-bold ${cardText} flex items-center gap-1.5 truncate`}
                        style={{ fontFamily: "ReginaBlack" }}
                      >
                        {o.is_birthday_treat && (
                          <span title="Cumpleaños del cliente">🎂</span>
                        )}
                        {o.is_welcome_courtesy && !o.is_birthday_treat && (
                          <span title="Cortesía de bienvenida">🎁</span>
                        )}
                        {o.is_courtesy &&
                          !o.is_birthday_treat &&
                          !o.is_welcome_courtesy && (
                            <span title="Cortesía piloto (código)">🎁</span>
                          )}
                        <span className="truncate">{o.folio}</span>
                      </div>
                      <div
                        className={`text-sm font-bold ${cardText} truncate`}
                        style={{ fontFamily: "Termina" }}
                      >
                        {o.customer?.name ?? "—"}
                      </div>
                    </div>
                    <div className={`text-right ${subText} flex-shrink-0`}>
                      <div className="text-[10px] lg:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        {statusEmoji(o.status)} {statusLabel(o.status)}
                      </div>
                      <div className="text-base lg:text-lg font-bold mt-1 whitespace-nowrap">
                        ⏱ {formatElapsed(mins)}
                      </div>
                      <div className={`text-[10px] uppercase tracking-wider ${subText} whitespace-nowrap`}>
                        {phaseTimerLabel(o.status)}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <ul className={`text-sm space-y-1 ${cardText}`}>
                    {o.items.map((it) => {
                      const [name, detail] = it.product_name.split(" [");
                      return (
                        <li key={it.id}>
                          <span className="font-bold">{it.quantity}×</span>{" "}
                          {name}
                          {detail && (
                            <div
                              className={`text-[10px] ${subText} italic pl-6`}
                            >
                              {detail.replace(/\]$/, "")}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Logística mini */}
                  <div className={`text-xs space-y-0.5 ${subText} border-t pt-2 border-current/10`}>
                    {o.pickup_date && (
                      <div>
                        📅 Recoger:{" "}
                        <b className={cardText}>
                          {new Date(o.pickup_date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                        </b>
                      </div>
                    )}
                    {o.contact_person && (
                      <div>
                        👤 Atiende:{" "}
                        <b className={`capitalize ${cardText}`}>
                          {o.contact_person}
                        </b>
                      </div>
                    )}
                    {o.notes && (
                      <div className={`italic mt-1 pl-1 border-l-2 border-current/20 ${cardText}`}>
                        📝 {o.notes}
                      </div>
                    )}
                  </div>

                  {/* Botones grandes táctiles */}
                  <div className="mt-1">
                    {o.status === "pending" && (
                      <button
                        onClick={() => advance(o.id, "accepted")}
                        disabled={isUpdating}
                        className="w-full bg-verde text-white rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow"
                      >
                        {isUpdating ? <IconLoader2 size={20} className="animate-spin" /> : <><IconCheck size={20} /> Aceptar</>}
                      </button>
                    )}
                    {o.status === "accepted" && (
                      <button
                        onClick={() => advance(o.id, "baking")}
                        disabled={isUpdating}
                        className="w-full bg-antojo text-white rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow"
                      >
                        {isUpdating ? <IconLoader2 size={20} className="animate-spin" /> : <><IconFlame size={20} /> Meter al horno</>}
                      </button>
                    )}
                    {o.status === "baking" && (
                      <button
                        onClick={() => advance(o.id, "delivered")}
                        disabled={isUpdating}
                        className="w-full bg-cafe text-crema rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow"
                      >
                        {isUpdating ? <IconLoader2 size={20} className="animate-spin" /> : <><IconPackage size={20} /> Marcar entregado</>}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children, theme }: { active: boolean; onClick: () => void; children: React.ReactNode; theme: Theme }) {
  const activeCls = theme === "dark" ? "bg-crema text-cafe" : "bg-cafe text-crema";
  const inactiveCls = theme === "dark" ? "bg-canela text-crema" : "bg-white text-cafe";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${active ? activeCls + " shadow" : inactiveCls}`}
    >
      {children}
    </button>
  );
}

function IconButton({ onClick, children, theme, title }: { onClick: () => void; children: React.ReactNode; theme: Theme; title: string }) {
  const cls = theme === "dark" ? "bg-canela text-crema" : "bg-white text-cafe";
  return (
    <button
      onClick={onClick}
      title={title}
      className={`${cls} w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition shadow-sm`}
    >
      {children}
    </button>
  );
}
