"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconFlame,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconSun,
  IconMoon,
  IconVolume,
  IconBellOff,
  IconBell,
  IconChefHat,
  IconClipboardList,
  IconChevronRight,
  IconX,
  IconHistory,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type ActiveStatus = "pending" | "accepted" | "baking" | "ready";
type AllStatus = ActiveStatus | "delivered";

type OrderRow = {
  id: string;
  folio: string;
  status: AllStatus;
  total: number;
  payment_method: string | null;
  contact_person: string | null;
  pickup_date: string | null;
  created_at: string;
  accepted_at: string | null;
  baking_started_at: string | null;
  ready_at: string | null;
  delivered_at?: string | null;
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

type ColumnKey = "pedidos" | "horno" | "listos";
type Theme = "light" | "dark";

const SOUND_KEY = "masamia:kds:sound";
const THEME_KEY = "masamia:kds:theme";
const TAB_KEY = "masamia:kds:tab";

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

function phaseStartIso(o: OrderRow): string {
  if (o.status === "ready")
    return o.ready_at ?? o.baking_started_at ?? o.accepted_at ?? o.created_at;
  if (o.status === "baking")
    return o.baking_started_at ?? o.accepted_at ?? o.created_at;
  if (o.status === "accepted") return o.accepted_at ?? o.created_at;
  return o.created_at;
}

function urgencyBorder(o: OrderRow, mins: number) {
  if (o.status === "pending") {
    if (mins < 5) return "border-l-verde";
    if (mins < 15) return "border-l-[#F4B84D]";
    return "border-l-rojo";
  }
  if (o.status === "accepted") {
    if (mins < 30) return "border-l-verde";
    if (mins < 90) return "border-l-[#F4B84D]";
    return "border-l-rojo";
  }
  if (o.status === "baking") {
    if (mins < 15) return "border-l-verde";
    if (mins < 25) return "border-l-[#F4B84D]";
    return "border-l-rojo";
  }
  // ready
  if (mins < 15) return "border-l-verde";
  if (mins < 45) return "border-l-[#F4B84D]";
  return "border-l-rojo";
}

function phaseTimerLabel(status: AllStatus): string {
  if (status === "pending") return "sin aceptar";
  if (status === "accepted") return "en cola";
  if (status === "baking") return "en horno";
  if (status === "ready") return "esperando cliente";
  return "entregado";
}

function statusBadge(status: AllStatus) {
  if (status === "pending")
    return { emoji: "🟡", label: "Nuevo", color: "bg-[#F4B84D] text-cafe" };
  if (status === "accepted")
    return { emoji: "🟢", label: "En cola", color: "bg-verde text-white" };
  if (status === "baking")
    return { emoji: "🔥", label: "Horneando", color: "bg-antojo text-white" };
  if (status === "ready")
    return { emoji: "✨", label: "Listo", color: "bg-cafe text-crema" };
  return { emoji: "✅", label: "Entregado", color: "bg-canela text-crema" };
}

export default function KitchenDisplay({
  initialOrders,
  initialDelivered,
}: {
  initialOrders: OrderRow[];
  initialDelivered: OrderRow[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [delivered, setDelivered] = useState<OrderRow[]>(initialDelivered);
  const [theme, setTheme] = useState<Theme>("light");
  const [soundOn, setSoundOn] = useState(true);
  const [, setTick] = useState(0); // forzar re-render para tiempo transcurrido
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ColumnKey>("pedidos");
  const [showDelivered, setShowDelivered] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Cargar preferencias
  useEffect(() => {
    try {
      const s = localStorage.getItem(SOUND_KEY);
      if (s !== null) setSoundOn(s === "1");
      const t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") setTheme(t);
      const tab = localStorage.getItem(TAB_KEY);
      if (tab === "pedidos" || tab === "horno" || tab === "listos")
        setActiveTab(tab);
    } catch {}
  }, []);

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
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, activeTab);
    } catch {}
  }, [activeTab]);

  // Tick cada 30s
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Wake lock
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

  // Realtime
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

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  useEffect(() => {
    setDelivered(initialDelivered);
  }, [initialDelivered]);

  const advance = async (
    orderId: string,
    nextStatus: "accepted" | "baking" | "ready" | "delivered"
  ) => {
    setUpdating(orderId);
    const supabase = createClient();
    const update: Record<string, any> = { status: nextStatus };
    if (nextStatus === "accepted")
      update.accepted_at = new Date().toISOString();
    if (nextStatus === "baking")
      update.baking_started_at = new Date().toISOString();
    if (nextStatus === "ready") update.ready_at = new Date().toISOString();
    if (nextStatus === "delivered")
      update.delivered_at = new Date().toISOString();
    await supabase.from("orders").update(update).eq("id", orderId);
    setUpdating(null);
    router.refresh();
  };

  // Agrupar por columna
  const columns = useMemo(() => {
    return {
      pedidos: orders.filter(
        (o) => o.status === "pending" || o.status === "accepted"
      ),
      horno: orders.filter((o) => o.status === "baking"),
      listos: orders.filter((o) => o.status === "ready"),
    };
  }, [orders]);

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-cafe text-crema" : "bg-crema-soft text-cafe";
  const cardBg = isDark ? "bg-canela" : "bg-white";
  const cardText = isDark ? "text-crema" : "text-cafe";
  const subText = isDark ? "text-caramelo" : "text-canela";
  const surfaceBg = isDark ? "bg-[#4a3324]" : "bg-[#FFF7E8]";

  return (
    <div className={`min-h-screen ${bgClass} transition-colors`}>
      {/* Top controls */}
      <div
        className="sticky top-[88px] z-20 backdrop-blur"
        style={{
          background: isDark
            ? "rgba(58,39,29,0.92)"
            : "rgba(251,244,230,0.92)",
        }}
      >
        <div className="px-3 lg:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          {/* Tabs solo visibles en md y abajo */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <TabChip
              active={activeTab === "pedidos"}
              onClick={() => setActiveTab("pedidos")}
              theme={theme}
              icon={<IconClipboardList size={14} />}
            >
              Pedidos ({columns.pedidos.length})
            </TabChip>
            <TabChip
              active={activeTab === "horno"}
              onClick={() => setActiveTab("horno")}
              theme={theme}
              icon={<IconFlame size={14} />}
            >
              Horno ({columns.horno.length})
            </TabChip>
            <TabChip
              active={activeTab === "listos"}
              onClick={() => setActiveTab("listos")}
              theme={theme}
              icon={<IconPackage size={14} />}
            >
              Listos ({columns.listos.length})
            </TabChip>
          </div>

          {/* Resumen en horizontal lg+ */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className={subText}>Total activos:</span>
            <span className={cardText}>{orders.length}</span>
            <span className={subText}>·</span>
            <span>🟡 {columns.pedidos.filter((o) => o.status === "pending").length}</span>
            <span>🟢 {columns.pedidos.filter((o) => o.status === "accepted").length}</span>
            <span>🔥 {columns.horno.length}</span>
            <span>✨ {columns.listos.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              onClick={() => setShowDelivered(true)}
              theme={theme}
              title="Ver entregados de hoy"
            >
              <IconHistory size={18} />
            </IconButton>
            <IconButton
              onClick={() => playBell()}
              theme={theme}
              title="Probar sonido"
            >
              <IconVolume size={18} />
            </IconButton>
            <IconButton
              onClick={() => setSoundOn((v) => !v)}
              theme={theme}
              title={soundOn ? "Desactivar sonido" : "Activar sonido"}
            >
              {soundOn ? <IconBell size={18} /> : <IconBellOff size={18} />}
            </IconButton>
            <IconButton
              onClick={() => setTheme(isDark ? "light" : "dark")}
              theme={theme}
              title="Cambiar tema"
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
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

      {/* Kanban en lg+, una columna en md y abajo */}
      <div className="p-3 lg:p-4">
        {/* Vista kanban (lg+) */}
        <div className="hidden lg:grid grid-cols-3 gap-3 xl:gap-4 min-h-[calc(100vh-180px)]">
          <ColumnView
            title="Pedidos"
            icon={<IconClipboardList size={20} />}
            tone="amarillo"
            theme={theme}
            orders={columns.pedidos}
            updating={updating}
            advance={advance}
            cardBg={cardBg}
            cardText={cardText}
            subText={subText}
            surfaceBg={surfaceBg}
          />
          <ColumnView
            title="En el horno"
            icon={<IconFlame size={20} />}
            tone="antojo"
            theme={theme}
            orders={columns.horno}
            updating={updating}
            advance={advance}
            cardBg={cardBg}
            cardText={cardText}
            subText={subText}
            surfaceBg={surfaceBg}
          />
          <ColumnView
            title="Listos para entrega"
            icon={<IconPackage size={20} />}
            tone="verde"
            theme={theme}
            orders={columns.listos}
            updating={updating}
            advance={advance}
            cardBg={cardBg}
            cardText={cardText}
            subText={subText}
            surfaceBg={surfaceBg}
          />
        </div>

        {/* Vista mobile (una columna según tab) */}
        <div className="lg:hidden">
          {activeTab === "pedidos" && (
            <ColumnView
              title="Pedidos"
              icon={<IconClipboardList size={20} />}
              tone="amarillo"
              theme={theme}
              orders={columns.pedidos}
              updating={updating}
              advance={advance}
              cardBg={cardBg}
              cardText={cardText}
              subText={subText}
              surfaceBg={surfaceBg}
              flat
            />
          )}
          {activeTab === "horno" && (
            <ColumnView
              title="En el horno"
              icon={<IconFlame size={20} />}
              tone="antojo"
              theme={theme}
              orders={columns.horno}
              updating={updating}
              advance={advance}
              cardBg={cardBg}
              cardText={cardText}
              subText={subText}
              surfaceBg={surfaceBg}
              flat
            />
          )}
          {activeTab === "listos" && (
            <ColumnView
              title="Listos para entrega"
              icon={<IconPackage size={20} />}
              tone="verde"
              theme={theme}
              orders={columns.listos}
              updating={updating}
              advance={advance}
              cardBg={cardBg}
              cardText={cardText}
              subText={subText}
              surfaceBg={surfaceBg}
              flat
            />
          )}
        </div>
      </div>

      {/* Drawer de entregados */}
      {showDelivered && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDelivered(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className={`absolute right-0 top-0 h-full w-full sm:w-[420px] ${cardBg} shadow-2xl flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={`flex items-center justify-between p-4 border-b border-current/10 ${cardText}`}>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "Termina" }}>
                  Entregados hoy
                </h2>
                <p className={`text-xs ${subText}`}>
                  {delivered.length} pedido{delivered.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() => setShowDelivered(false)}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${surfaceBg} active:scale-90 transition`}
              >
                <IconX size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {delivered.length === 0 ? (
                <div className={`text-center py-12 ${subText}`}>
                  <IconChefHat size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">Aún nada entregado hoy.</p>
                </div>
              ) : (
                delivered.map((o) => (
                  <div
                    key={o.id}
                    className={`${surfaceBg} rounded-xl p-3 flex items-center justify-between gap-2`}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-base font-bold ${cardText} truncate`}
                        style={{ fontFamily: "ReginaBlack" }}
                      >
                        {o.folio}
                      </div>
                      <div className={`text-xs ${cardText} truncate`}>
                        {o.customer?.name ?? "—"} ·{" "}
                        {o.items.reduce((a, b) => a + b.quantity, 0)} pza
                      </div>
                    </div>
                    <div className={`text-right text-xs ${subText} flex-shrink-0`}>
                      <div>
                        {o.delivered_at
                          ? new Date(o.delivered_at).toLocaleTimeString(
                              "es-MX",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "—"}
                      </div>
                      <div className="font-bold text-verde">✅</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COLUMNA
// ============================================================
function ColumnView({
  title,
  icon,
  tone,
  theme,
  orders,
  updating,
  advance,
  cardBg,
  cardText,
  subText,
  surfaceBg,
  flat,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "amarillo" | "antojo" | "verde";
  theme: Theme;
  orders: OrderRow[];
  updating: string | null;
  advance: (id: string, next: "accepted" | "baking" | "ready" | "delivered") => void;
  cardBg: string;
  cardText: string;
  subText: string;
  surfaceBg: string;
  flat?: boolean;
}) {
  const toneHeader = {
    amarillo: "bg-[#F4B84D] text-cafe",
    antojo: "bg-antojo text-white",
    verde: "bg-verde text-white",
  }[tone];

  return (
    <section
      className={`${flat ? "" : `${surfaceBg} rounded-2xl`} flex flex-col ${
        flat ? "gap-3" : "p-2"
      }`}
    >
      {/* Header columna */}
      <header
        className={`${toneHeader} rounded-xl px-3 py-2 flex items-center justify-between shadow-sm`}
      >
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm" style={{ fontFamily: "Termina" }}>
          {icon}
          {title}
        </div>
        <span className="text-2xl font-bold" style={{ fontFamily: "ReginaBlack" }}>
          {orders.length}
        </span>
      </header>

      {/* Cards */}
      <div className={`${flat ? "" : "mt-2"} flex flex-col gap-2.5 lg:gap-3 overflow-y-auto lg:max-h-[calc(100vh-260px)] pr-1`}>
        {orders.length === 0 ? (
          <div className={`text-center py-10 ${subText}`}>
            <p className="text-xs italic">Nada por aquí.</p>
          </div>
        ) : (
          orders.map((o) => (
            <Card
              key={o.id}
              o={o}
              theme={theme}
              updating={updating === o.id}
              advance={advance}
              cardBg={cardBg}
              cardText={cardText}
              subText={subText}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ============================================================
// CARD
// ============================================================
function Card({
  o,
  theme,
  updating,
  advance,
  cardBg,
  cardText,
  subText,
}: {
  o: OrderRow;
  theme: Theme;
  updating: boolean;
  advance: (id: string, next: "accepted" | "baking" | "ready" | "delivered") => void;
  cardBg: string;
  cardText: string;
  subText: string;
}) {
  const mins = minutesAgo(phaseStartIso(o));
  const border = urgencyBorder(o, mins);
  const badge = statusBadge(o.status);

  return (
    <article
      className={`${cardBg} rounded-xl shadow p-3 flex flex-col gap-2 border-l-4 ${border} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className={`text-xl xl:text-2xl font-bold ${cardText} flex items-center gap-1.5`}
            style={{ fontFamily: "ReginaBlack" }}
          >
            {o.is_birthday_treat && <span title="Cumple">🎂</span>}
            {o.is_welcome_courtesy && !o.is_birthday_treat && (
              <span title="Bienvenida">🎁</span>
            )}
            {o.is_courtesy &&
              !o.is_birthday_treat &&
              !o.is_welcome_courtesy && <span title="Cortesía">🎁</span>}
            <span className="truncate">{o.folio}</span>
          </div>
          <div
            className={`text-xs font-bold ${cardText} truncate`}
            style={{ fontFamily: "Termina" }}
          >
            {o.customer?.name ?? "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span
            className={`${badge.color} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap`}
          >
            {badge.emoji} {badge.label}
          </span>
          <div className={`text-sm font-bold ${cardText} whitespace-nowrap`}>
            ⏱ {formatElapsed(mins)}
          </div>
          <div className={`text-[9px] uppercase tracking-wider ${subText} whitespace-nowrap`}>
            {phaseTimerLabel(o.status)}
          </div>
        </div>
      </div>

      {/* Items */}
      <ul className={`text-xs space-y-0.5 ${cardText} bg-current/[0.03] rounded-md px-2 py-1.5`}>
        {o.items.map((it) => {
          const [name, detail] = it.product_name.split(" [");
          return (
            <li key={it.id} className="leading-tight">
              <span className="font-bold">{it.quantity}×</span> {name}
              {detail && (
                <div className={`text-[9px] ${subText} italic pl-5`}>
                  {detail.replace(/\]$/, "")}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Logística mini */}
      <div className={`text-[11px] space-y-0.5 ${subText}`}>
        {o.pickup_date && (
          <div className="flex items-center gap-1">
            📅
            <b className={cardText}>
              {new Date(o.pickup_date + "T12:00:00").toLocaleDateString(
                "es-MX",
                { weekday: "short", day: "numeric", month: "short" }
              )}
            </b>
          </div>
        )}
        {o.contact_person && (
          <div className="flex items-center gap-1">
            👤
            <b className={`capitalize ${cardText}`}>{o.contact_person}</b>
          </div>
        )}
        {o.notes && (
          <div className={`italic mt-1 pl-1 border-l-2 border-current/20 ${cardText}`}>
            📝 {o.notes}
          </div>
        )}
      </div>

      {/* Botón principal */}
      <ActionButton o={o} updating={updating} advance={advance} />
    </article>
  );
}

function ActionButton({
  o,
  updating,
  advance,
}: {
  o: OrderRow;
  updating: boolean;
  advance: (id: string, next: "accepted" | "baking" | "ready" | "delivered") => void;
}) {
  const base =
    "w-full rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-sm";
  const spinner = <IconLoader2 size={16} className="animate-spin" />;

  if (o.status === "pending") {
    return (
      <button
        onClick={() => advance(o.id, "accepted")}
        disabled={updating}
        className={`${base} bg-verde text-white`}
      >
        {updating ? spinner : (
          <>
            <IconCheck size={16} /> Aceptar
          </>
        )}
      </button>
    );
  }
  if (o.status === "accepted") {
    return (
      <button
        onClick={() => advance(o.id, "baking")}
        disabled={updating}
        className={`${base} bg-antojo text-white`}
      >
        {updating ? spinner : (
          <>
            <IconFlame size={16} /> Meter al horno
          </>
        )}
      </button>
    );
  }
  if (o.status === "baking") {
    return (
      <button
        onClick={() => advance(o.id, "ready")}
        disabled={updating}
        className={`${base} bg-cafe text-crema`}
      >
        {updating ? spinner : (
          <>
            <IconChevronRight size={16} /> Sacar del horno
          </>
        )}
      </button>
    );
  }
  // ready
  return (
    <button
      onClick={() => advance(o.id, "delivered")}
      disabled={updating}
      className={`${base} bg-[#3A271D] text-crema`}
    >
      {updating ? spinner : (
        <>
          <IconPackage size={16} /> Marcar entregado
        </>
      )}
    </button>
  );
}

// ============================================================
// CONTROLES
// ============================================================
function TabChip({
  active,
  onClick,
  children,
  theme,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  theme: Theme;
  icon?: React.ReactNode;
}) {
  const activeCls =
    theme === "dark" ? "bg-crema text-cafe" : "bg-cafe text-crema";
  const inactiveCls =
    theme === "dark" ? "bg-canela text-crema" : "bg-white text-cafe";
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
        active ? activeCls + " shadow" : inactiveCls
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  onClick,
  children,
  theme,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  theme: Theme;
  title: string;
}) {
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
