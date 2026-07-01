"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  IconBrandWhatsapp,
  IconListNumbers,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import ProductionPlanDrawer from "./ProductionPlanDrawer";

type ActiveStatus = "pending" | "accepted" | "baking" | "ready";
type AllStatus = ActiveStatus | "delivered" | "declined" | "cancelled";

type OrderRow = {
  id: string;
  folio: string;
  status: AllStatus;
  total: number;
  payment_method: string | null;
  contact_person: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  created_at: string;
  accepted_at: string | null;
  baking_started_at: string | null;
  ready_at: string | null;
  delivered_at?: string | null;
  customer_notified_at?: string | null;
  notes: string | null;
  decline_reason?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: "customer" | "staff" | null;
  is_courtesy: boolean | null;
  is_birthday_treat: boolean | null;
  is_welcome_courtesy: boolean | null;
  is_special: boolean | null;
  over_capacity: boolean | null;
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

type DrawerTab = "entregados" | "declinados" | "cancelados" | "historico";

export default function KitchenDisplay({
  initialOrders,
  initialDelivered,
  initialDeclined,
  initialCancelled,
  initialHistory,
}: {
  initialOrders: OrderRow[];
  initialDelivered: OrderRow[];
  initialDeclined: OrderRow[];
  initialCancelled: OrderRow[];
  initialHistory: OrderRow[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [delivered, setDelivered] = useState<OrderRow[]>(initialDelivered);
  const [declined, setDeclined] = useState<OrderRow[]>(initialDeclined);
  const [cancelled, setCancelled] = useState<OrderRow[]>(initialCancelled);
  const [history, setHistory] = useState<OrderRow[]>(initialHistory);
  const [theme, setTheme] = useState<Theme>("light");
  const [soundOn, setSoundOn] = useState(true);
  const [, setTick] = useState(0); // forzar re-render para tiempo transcurrido
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ColumnKey>("pedidos");
  const [showDelivered, setShowDelivered] = useState(false);
  const [showProductionPlan, setShowProductionPlan] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("entregados");
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
  useEffect(() => {
    setDeclined(initialDeclined);
  }, [initialDeclined]);
  useEffect(() => {
    setCancelled(initialCancelled);
  }, [initialCancelled]);
  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

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

  /**
   * Avisar al cliente que su pedido está listo:
   *  1. Abre WhatsApp con mensaje pre-armado en tono Miga
   *  2. Marca customer_notified_at para que la UI sepa que ya se avisó
   *
   * El número viene del cliente del pedido. Si no hay número, no hace nada.
   */
  const notifyCustomerReady = async (o: OrderRow) => {
    if (!o.customer?.whatsapp) return;
    setUpdating(o.id);

    // Construye el número con código país MX si no lo tiene.
    const raw = o.customer.whatsapp.replace(/\D/g, "");
    const wa = raw.startsWith("52") ? raw : `52${raw}`;

    const nombre = o.customer.name?.split(" ")[0] ?? "";
    const saludo = nombre ? `¡Hola ${nombre}! ` : "";
    let horaTxt = "";
    if (o.pickup_time) {
      const [h, m] = o.pickup_time.split(":").map(Number);
      const period = h >= 12 ? "pm" : "am";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      horaTxt = ` Te esperamos a las ${h12}:${String(m).padStart(2, "0")} ${period}.`;
    }
    const mensaje =
      `${saludo}Tu pedido ${o.folio} ya está recién horneado y listo para ` +
      `recoger 🥐${horaTxt}\n\n¡Buen provecho!\n— Masa Mía`;

    // Abrimos WhatsApp ANTES del await para que el gesto del usuario
    // todavía esté activo (iOS bloquea window.open en otros casos).
    window.open(
      `https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );

    // Después marcamos en DB.
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ customer_notified_at: new Date().toISOString() })
      .eq("id", o.id);
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
      {/* Top controls — sticky justo debajo del StaffHeader (92px alto).
          IMPORTANTE: el root NO tiene overflow-x-hidden — eso convertía este
          div en scroll-container y rompía el sticky (lo posicionaba relativo
          al div, no al viewport). Por eso quedaba flotando lejos del header. */}
      <div
        className="sticky top-[92px] z-20 shadow-md"
        style={{
          background: isDark ? "#3A271D" : "#FBF4E6",
        }}
      >
        <div className="px-3 lg:px-6 py-2 lg:py-2.5 flex items-center justify-between gap-2 flex-wrap">
          {/* Tabs en mobile (md y abajo) — táctiles, equitativos sin overflow */}
          <div className="flex items-stretch gap-1 lg:hidden w-full sm:w-auto min-w-0">
            <TabChip
              active={activeTab === "pedidos"}
              onClick={() => setActiveTab("pedidos")}
              theme={theme}
              icon={<IconClipboardList size={16} />}
              count={columns.pedidos.length}
              tone="amarillo"
            >
              Pedidos
            </TabChip>
            <TabChip
              active={activeTab === "horno"}
              onClick={() => setActiveTab("horno")}
              theme={theme}
              icon={<IconFlame size={16} />}
              count={columns.horno.length}
              tone="antojo"
            >
              Horno
            </TabChip>
            <TabChip
              active={activeTab === "listos"}
              onClick={() => setActiveTab("listos")}
              theme={theme}
              icon={<IconPackage size={16} />}
              count={columns.listos.length}
              tone="verde"
            >
              Listos
            </TabChip>
          </div>

          {/* Resumen en horizontal lg+ */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
            <span className={subText}>Total activos:</span>
            <span className={`${cardText} text-base`}>{orders.length}</span>
            <span className={subText}>·</span>
            <span>🟡 {columns.pedidos.filter((o) => o.status === "pending").length} nuevos</span>
            <span>🟢 {columns.pedidos.filter((o) => o.status === "accepted").length} en cola</span>
            <span>🔥 {columns.horno.length} hornean</span>
            <span>✨ {columns.listos.length} listos</span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              onClick={() => setShowProductionPlan(true)}
              theme={theme}
              title="Plan de producción del día"
            >
              <IconListNumbers size={18} />
            </IconButton>
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
      <div className="p-3 lg:p-4 xl:p-6">
        {/* Vista kanban (lg+) — full width del viewport */}
        <div className="hidden lg:grid grid-cols-3 gap-4 xl:gap-6 min-h-[calc(100vh-180px)]">
          <ColumnView
            title="Pedidos"
            icon={<IconClipboardList size={20} />}
            tone="amarillo"
            theme={theme}
            orders={columns.pedidos}
            updating={updating}
            advance={advance}
            notifyCustomerReady={notifyCustomerReady}
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
            notifyCustomerReady={notifyCustomerReady}
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
            notifyCustomerReady={notifyCustomerReady}
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
              notifyCustomerReady={notifyCustomerReady}
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
              notifyCustomerReady={notifyCustomerReady}
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
              notifyCustomerReady={notifyCustomerReady}
              cardBg={cardBg}
              cardText={cardText}
              subText={subText}
              surfaceBg={surfaceBg}
              flat
            />
          )}
        </div>
      </div>

      {/* Drawer histórico con tabs */}
      {showDelivered && (
        <HistoryDrawer
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          delivered={delivered}
          declined={declined}
          cancelled={cancelled}
          history={history}
          onClose={() => setShowDelivered(false)}
          cardBg={cardBg}
          cardText={cardText}
          subText={subText}
          surfaceBg={surfaceBg}
        />
      )}

      {/* Drawer plan de producción */}
      {showProductionPlan && (
        <ProductionPlanDrawer
          orders={orders}
          onClose={() => setShowProductionPlan(false)}
          cardBg={cardBg}
          cardText={cardText}
          subText={subText}
          surfaceBg={surfaceBg}
        />
      )}
    </div>
  );
}

// ============================================================
// DRAWER HISTÓRICO CON TABS
// ============================================================
function HistoryDrawer({
  drawerTab,
  setDrawerTab,
  delivered,
  declined,
  cancelled,
  history,
  onClose,
  cardBg,
  cardText,
  subText,
  surfaceBg,
}: {
  drawerTab: DrawerTab;
  setDrawerTab: (t: DrawerTab) => void;
  delivered: OrderRow[];
  declined: OrderRow[];
  cancelled: OrderRow[];
  history: OrderRow[];
  onClose: () => void;
  cardBg: string;
  cardText: string;
  subText: string;
  surfaceBg: string;
}) {
  const tabs: { key: DrawerTab; label: string; count: number; emoji: string }[] = [
    { key: "entregados", label: "Entregados hoy", count: delivered.length, emoji: "✅" },
    { key: "declinados", label: "Declinados", count: declined.length, emoji: "❌" },
    { key: "cancelados", label: "Cancelados", count: cancelled.length, emoji: "🚫" },
    { key: "historico", label: "Histórico 30d", count: history.length, emoji: "📜" },
  ];
  const activeRows: OrderRow[] =
    drawerTab === "entregados"
      ? delivered
      : drawerTab === "declinados"
      ? declined
      : drawerTab === "cancelados"
      ? cancelled
      : history;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[460px] ${cardBg} shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={`flex items-center justify-between p-4 border-b border-current/10 ${cardText}`}>
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "Termina" }}>
              Histórico
            </h2>
            <p className={`text-xs ${subText}`}>
              Pedidos cerrados y archivados
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${surfaceBg} active:scale-90 transition`}
          >
            <IconX size={18} />
          </button>
        </header>

        {/* Tabs */}
        <div className={`px-3 pt-3 pb-2 border-b border-current/10 ${cardText}`}>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setDrawerTab(t.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 ${
                  drawerTab === t.key
                    ? `${surfaceBg} shadow-sm`
                    : "opacity-60 hover:opacity-100"
                }`}
                style={{ fontFamily: "Termina" }}
              >
                <span>{t.emoji}</span>
                <span className="uppercase tracking-wider">{t.label}</span>
                <span className={`text-[11px] px-1.5 rounded-full ${drawerTab === t.key ? "bg-current/15" : "bg-current/10"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeRows.length === 0 ? (
            <div className={`text-center py-12 ${subText}`}>
              <IconChefHat size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm italic">
                {drawerTab === "entregados" && "Aún nada entregado hoy."}
                {drawerTab === "declinados" && "Sin declinados en 30 días."}
                {drawerTab === "cancelados" && "Sin cancelados en 30 días."}
                {drawerTab === "historico" && "Sin movimientos en 30 días."}
              </p>
            </div>
          ) : (
            activeRows.map((o) => (
              <HistoryItem
                key={o.id}
                order={o}
                tab={drawerTab}
                surfaceBg={surfaceBg}
                cardText={cardText}
                subText={subText}
                onClose={onClose}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function HistoryItem({
  order: o,
  tab,
  surfaceBg,
  cardText,
  subText,
  onClose,
}: {
  order: OrderRow;
  tab: DrawerTab;
  surfaceBg: string;
  cardText: string;
  subText: string;
  onClose: () => void;
}) {
  const piezas = o.items.reduce((a, b) => a + b.quantity, 0);

  // Para histórico, mostrar el badge de status
  const statusInfo = (() => {
    if (o.status === "delivered") return { emoji: "✅", color: "text-verde" };
    if (o.status === "declined") return { emoji: "❌", color: "text-rojo" };
    if (o.status === "cancelled") return { emoji: "🚫", color: "text-canela" };
    return { emoji: "·", color: subText };
  })();

  const hora = (() => {
    if (o.status === "delivered" && o.delivered_at)
      return new Date(o.delivered_at).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
    const d = new Date(o.created_at);
    const today = new Date();
    const sameDay =
      d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  })();

  return (
    <Link
      href={`/staff/pedidos/${o.id}`}
      onClick={onClose}
      className={`${surfaceBg} rounded-xl p-3 flex items-center justify-between gap-2 active:scale-[0.99] transition`}
    >
      <div className="min-w-0 flex-1">
        <div
          className={`text-base font-bold ${cardText} truncate`}
          style={{ fontFamily: "ReginaBlack" }}
        >
          {o.folio}
        </div>
        <div className={`text-xs ${cardText} truncate`}>
          {o.customer?.name ?? "—"} · {piezas} pza
        </div>
        {(tab === "declinados" || tab === "historico") && o.decline_reason && (
          <div className={`text-[11px] italic ${subText} truncate`}>
            Razón: {o.decline_reason}
          </div>
        )}
        {(tab === "cancelados" || tab === "historico") && o.cancel_reason && (
          <div className={`text-[11px] italic ${subText} truncate`}>
            {o.cancelled_by === "customer" ? "Cliente canceló: " : "Cancelado: "}
            {o.cancel_reason}
          </div>
        )}
      </div>
      <div className={`text-right text-xs ${subText} flex-shrink-0`}>
        <div>{hora}</div>
        <div className={`font-bold ${statusInfo.color}`}>
          {statusInfo.emoji}
        </div>
      </div>
    </Link>
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
  notifyCustomerReady,
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
  notifyCustomerReady: (o: OrderRow) => void;
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
      className={`${flat ? "" : `${surfaceBg} rounded-2xl`} flex flex-col min-w-0 ${
        flat ? "gap-3" : "p-2"
      }`}
    >
      {/* Header columna — solo en kanban (lg+). En mobile la tab ya etiqueta. */}
      {!flat && (
        <header
          className={`${toneHeader} rounded-xl px-3 py-2 flex items-center justify-between shadow-sm`}
        >
          <div
            className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm min-w-0 truncate"
            style={{ fontFamily: "Termina" }}
          >
            {icon}
            <span className="truncate">{title}</span>
          </div>
          <span
            className="text-2xl font-bold flex-shrink-0"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {orders.length}
          </span>
        </header>
      )}

      {/* Cards — scroll interno con min-h-0 (clave para que el flex respete
          max-h). Así el primer card SIEMPRE queda visible debajo de la sticky
          bar y los botones no se comen porque hay padding y scroll funciona
          como kanban real. */}
      <div className={`${flat ? "" : "mt-2"} flex flex-col gap-2.5 lg:gap-3 overflow-y-auto min-h-0 max-h-[calc(100vh-260px)] lg:max-h-[calc(100vh-220px)] pr-1 pb-3`}>
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
              notifyCustomerReady={notifyCustomerReady}
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
  notifyCustomerReady,
  cardBg,
  cardText,
  subText,
}: {
  o: OrderRow;
  theme: Theme;
  updating: boolean;
  advance: (id: string, next: "accepted" | "baking" | "ready" | "delivered") => void;
  notifyCustomerReady: (o: OrderRow) => void;
  cardBg: string;
  cardText: string;
  subText: string;
}) {
  const mins = minutesAgo(phaseStartIso(o));
  const border = urgencyBorder(o, mins);
  const badge = statusBadge(o.status);

  return (
    <Link
      href={`/staff/pedidos/${o.id}`}
      className={`${cardBg} rounded-xl shadow p-3 lg:p-4 flex flex-col gap-2 lg:gap-3 border-l-4 lg:border-l-[6px] ${border} overflow-hidden active:scale-[0.99] hover:shadow-lg transition cursor-pointer scroll-mt-[180px] lg:scroll-mt-[160px] shrink-0`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className={`text-xl lg:text-2xl xl:text-3xl font-bold ${cardText} flex items-center gap-1.5`}
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
            className={`text-xs lg:text-sm font-bold ${cardText} truncate mt-0.5`}
            style={{ fontFamily: "Termina" }}
          >
            {o.customer?.name ?? "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span
            className={`${badge.color} text-[11px] lg:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap`}
          >
            {badge.emoji} {badge.label}
          </span>
          <div className={`text-sm lg:text-base xl:text-lg font-bold ${cardText} whitespace-nowrap mt-1`}>
            ⏱ {formatElapsed(mins)}
          </div>
          <div className={`text-[11px] lg:text-[11px] uppercase tracking-wider ${subText} whitespace-nowrap`}>
            {phaseTimerLabel(o.status)}
          </div>
        </div>
      </div>

      {/* Alertas: pedido especial / día a tope (sobreproducción) */}
      {(o.is_special || o.over_capacity) && (
        <div className="flex flex-wrap gap-1.5">
          {o.is_special && (
            <span className="inline-flex items-center gap-1 bg-[#7C3AED] text-white text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              ✨ Especial · acepta tú
            </span>
          )}
          {o.over_capacity && (
            <span className="inline-flex items-center gap-1 bg-oro text-cafe text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              ⚠️ Día a tope · revisa
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <ul className={`text-xs lg:text-sm space-y-0.5 lg:space-y-1 ${cardText} bg-current/[0.03] rounded-md px-2 lg:px-3 py-1.5 lg:py-2`}>
        {o.items.map((it) => {
          const [name, detail] = it.product_name.split(" [");
          return (
            <li key={it.id} className="leading-tight">
              <span className="font-bold">{it.quantity}×</span> {name}
              {detail && (
                <div className={`text-[11px] lg:text-[11px] ${subText} italic pl-5`}>
                  {detail.replace(/\]$/, "")}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Logística mini */}
      <div className={`text-[11px] lg:text-xs space-y-0.5 ${subText}`}>
        {o.pickup_date && (
          <div className="flex items-center gap-1 flex-wrap">
            📅
            <b className={cardText}>
              {new Date(o.pickup_date + "T12:00:00").toLocaleDateString(
                "es-MX",
                { weekday: "short", day: "numeric", month: "short" }
              )}
            </b>
            {o.pickup_time && (
              <>
                <span className={subText}>·</span>
                🕒
                <b className={cardText}>
                  {(() => {
                    const [h, m] = o.pickup_time.split(":").map(Number);
                    const period = h >= 12 ? "pm" : "am";
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
                  })()}
                </b>
              </>
            )}
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

      {/* Botón principal — clicks no deben llevar al detalle */}
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <ActionButton
          o={o}
          updating={updating}
          advance={advance}
          notifyCustomerReady={notifyCustomerReady}
        />
      </div>
    </Link>
  );
}

function ActionButton({
  o,
  updating,
  advance,
  notifyCustomerReady,
}: {
  o: OrderRow;
  updating: boolean;
  advance: (id: string, next: "accepted" | "baking" | "ready" | "delivered") => void;
  notifyCustomerReady: (o: OrderRow) => void;
}) {
  const base =
    "w-full rounded-lg py-2.5 lg:py-3 text-sm lg:text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-sm mt-1";
  const spinner = <IconLoader2 size={18} className="animate-spin" />;

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
  // ready: dos botones apilados. Primero avisar (WA), luego marcar entregado.
  const yaAvisado = !!o.customer_notified_at;
  const minsAvisado = yaAvisado ? minutesAgo(o.customer_notified_at!) : 0;
  const tieneWa = !!o.customer?.whatsapp;

  return (
    <div className="flex flex-col gap-2 mt-1">
      {yaAvisado ? (
        <div className="w-full rounded-lg py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 bg-verde/15 text-verde">
          <IconCheck size={14} />
          Cliente avisado hace {formatElapsed(minsAvisado)}
        </div>
      ) : tieneWa ? (
        <button
          onClick={() => notifyCustomerReady(o)}
          disabled={updating}
          className={`${base.replace("mt-1", "")} bg-[#25D366] text-white`}
        >
          {updating ? spinner : (
            <>
              <IconBrandWhatsapp size={16} /> Avisar al cliente
            </>
          )}
        </button>
      ) : (
        <div className="w-full rounded-lg py-1.5 text-[11px] italic flex items-center justify-center bg-canela/15 text-canela">
          Sin WhatsApp — avisar manualmente
        </div>
      )}
      <button
        onClick={() => advance(o.id, "delivered")}
        disabled={updating}
        className={`${base.replace("mt-1", "")} bg-[#3A271D] text-crema`}
      >
        {updating ? spinner : (
          <>
            <IconPackage size={16} /> Marcar entregado
          </>
        )}
      </button>
    </div>
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
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  theme: Theme;
  icon?: React.ReactNode;
  count?: number;
  tone?: "amarillo" | "antojo" | "verde";
}) {
  const toneActive = {
    amarillo: "bg-[#F4B84D] text-cafe",
    antojo: "bg-antojo text-white",
    verde: "bg-verde text-white",
  };
  const inactiveCls =
    theme === "dark" ? "bg-canela text-crema" : "bg-white text-cafe";
  const activeBase =
    tone && toneActive[tone] ? toneActive[tone] : theme === "dark" ? "bg-crema text-cafe" : "bg-cafe text-crema";
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-initial min-w-0 px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
        active
          ? activeBase + " shadow-md"
          : inactiveCls + " opacity-80"
      }`}
      style={{ fontFamily: "Termina" }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="uppercase tracking-wider truncate">{children}</span>
      {typeof count === "number" && (
        <span
          className={`flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            active ? "bg-black/20" : "bg-current/15"
          }`}
        >
          {count}
        </span>
      )}
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
