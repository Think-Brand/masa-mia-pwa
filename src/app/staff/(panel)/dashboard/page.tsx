import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import {
  IconReceipt2,
  IconCash,
  IconTrendingUp,
  IconUsers,
  IconFlame,
  IconCrown,
  IconMessageHeart,
  IconCake,
  IconBrandWhatsapp,
  IconTarget,
  IconRepeat,
  IconClock,
  IconArrowUpRight,
  IconArrowDownRight,
  IconFileText,
} from "@tabler/icons-react";
import {
  BIRTHDAY_SETTLE_DAYS,
  daysSinceBirthdaySet,
  daysUntilBirthday,
  formatBirthday,
  todayMD,
} from "@/lib/birthday";
import {
  CATEGORY_LABEL,
  STATUS_STYLE,
  getCapacity,
  getMultiDayOccupancy,
} from "@/lib/capacity";

export const dynamic = "force-dynamic";

/** Meta de ventas mensual (MXN) por defecto si no hay setting configurada.
 *  El valor real viene de settings.monthly_sales_goal_mxn (editable en /staff/ajustes).
 *  Default bajo a propósito: emprendimiento arrancando — motivar, no desanimar. */
const DEFAULT_MONTHLY_GOAL_MXN = 8000;

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

/** Delta % entre actual y anterior. Devuelve null si no hay anterior. */
function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual > 0 ? 100 : null;
  return ((actual - anterior) / anterior) * 100;
}

/** Comentario contextual de Miga según ritmo vs meta. Voz cómplice de tribu
 *  — Miga le habla a "cocineros" como parte del equipo, no como mandona. */
function migaSaysGoal(pct: number, daysLeft: number, daysPassed: number): string {
  if (pct >= 150) return "Wooowww, hoy no solo lo hicimos bien, lo hicimos sobresaliente 🌟";
  if (pct >= 100) return "¡Lo logramos cocineros! Felicidades 🎉";
  if (pct >= 90) return "Ya mero, ya mero — unas horneadas más 🔥";
  if (pct >= 45 && pct < 65) return "Ya mero cocineros, estamos a la mitad 💪";
  if (pct >= 65) return "Vamos derecho a la meta, sin frenar.";
  if (pct >= 25) return "Buen ritmo, no soltamos.";
  if (daysPassed <= 5) return "Empieza el mes con todo, cocineros 🥐";
  if (daysLeft > 15) return "Calentamos horno — todavía hay mes por delante.";
  return "Toca apretar el paso, cocineros.";
}

export default async function DashboardPage() {
  const supabase = createClient();

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const daysInMonth = monthEnd.getDate();
  const daysPassed = now.getDate();
  const daysLeft = daysInMonth - daysPassed + 1;

  // ─── Pedidos del mes (actual + anterior, en paralelo) ─────────────────
  const [
    { data: monthOrders },
    { data: prevMonthOrders },
    { count: totalCustomers },
    { data: goalSetting },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, created_at, status, customer_id")
      .gte("created_at", monthStart.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase
      .from("orders")
      .select("id, total, created_at, customer_id")
      .gte("created_at", prevMonthStart.toISOString())
      .lte("created_at", prevMonthEnd.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "monthly_sales_goal_mxn")
      .maybeSingle(),
  ]);

  const monthlyGoal = (() => {
    const raw = Number(goalSetting?.value);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MONTHLY_GOAL_MXN;
  })();

  const mOrders = monthOrders ?? [];
  const pmOrders = prevMonthOrders ?? [];
  const todayOrders = mOrders.filter(
    (o: any) => new Date(o.created_at) >= today
  );

  const ventasMes = mOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const ventasHoy = todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const ventasPrevMes = pmOrders.reduce(
    (s: number, o: any) => s + Number(o.total),
    0
  );

  // Mismos días del mes anterior (para comparativa "hasta hoy")
  const cutoffPrev = new Date(prevMonthStart);
  cutoffPrev.setDate(Math.min(daysPassed, prevMonthEnd.getDate()));
  cutoffPrev.setHours(23, 59, 59, 999);
  const pmOrdersSamePeriod = pmOrders.filter(
    (o: any) => new Date(o.created_at) <= cutoffPrev
  );
  const ventasPrevMesSamePeriod = pmOrdersSamePeriod.reduce(
    (s: number, o: any) => s + Number(o.total),
    0
  );

  // KPI deltas (mismos días del mes pasado para comparación justa)
  const deltaVentasMes = deltaPct(ventasMes, ventasPrevMesSamePeriod);
  const deltaPedidosMes = deltaPct(mOrders.length, pmOrdersSamePeriod.length);
  const ticketActual = mOrders.length > 0 ? ventasMes / mOrders.length : 0;
  const ticketPrev =
    pmOrdersSamePeriod.length > 0
      ? ventasPrevMesSamePeriod / pmOrdersSamePeriod.length
      : 0;
  const deltaTicket = deltaPct(ticketActual, ticketPrev);

  // Clientes nuevos (esta semana)
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: nuevosEstaSemana } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString());

  // ─── Meta del mes ─────────────────────────────────────────────────────
  // metaPctReal puede pasar 100 cuando sobrepasamos — la barra se capa a 100
  // pero el mensaje de Miga necesita el % real para detectar "sobresaliente".
  const metaPctReal = (ventasMes / monthlyGoal) * 100;
  const metaPct = Math.min(100, metaPctReal);
  const ritmoNecesarioDiario =
    daysLeft > 0 && ventasMes < monthlyGoal
      ? (monthlyGoal - ventasMes) / daysLeft
      : 0;
  const migaMsgMeta = migaSaysGoal(metaPctReal, daysLeft, daysPassed);

  // ─── Retención 30 días ────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: last30Orders } = await supabase
    .from("orders")
    .select("customer_id, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .neq("status", "cancelled")
    .neq("status", "declined")
    .not("customer_id", "is", null);

  const ordersPerCustomer = new Map<string, number>();
  for (const o of last30Orders ?? []) {
    const cid = (o as any).customer_id as string;
    ordersPerCustomer.set(cid, (ordersPerCustomer.get(cid) ?? 0) + 1);
  }
  const totalClientesActivos = ordersPerCustomer.size;
  const clientesRecurrentes = Array.from(ordersPerCustomer.values()).filter(
    (n) => n >= 2
  ).length;
  const retencionPct =
    totalClientesActivos > 0
      ? (clientesRecurrentes / totalClientesActivos) * 100
      : 0;

  // ─── Heatmap hora pico (últimos 30 días, 7d × 24h) ─────────────────────
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );
  for (const o of last30Orders ?? []) {
    const d = new Date((o as any).created_at);
    const dayIdx = (d.getDay() + 6) % 7; // lunes=0, domingo=6
    const hour = d.getHours();
    heatmap[dayIdx][hour] += 1;
  }
  const heatmapMax = Math.max(1, ...heatmap.flat());
  // Solo mostramos horas relevantes (8am–11pm) para no saturar
  const hoursToShow = Array.from({ length: 16 }, (_, i) => i + 7); // 7-22
  const dayLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  // Top productos del mes
  const orderIds = mOrders.map((o: any) => o.id);
  let topProducts: { name: string; qty: number }[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity")
      .in("order_id", orderIds);
    const counts: Record<string, number> = {};
    for (const it of items ?? []) {
      const nombre = (it.product_name as string).split(" [")[0];
      counts[nombre] = (counts[nombre] ?? 0) + (it.quantity ?? 0);
    }
    topProducts = Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  // Cliente más fiel del mes
  let topCliente: { name: string; pedidos: number } | null = null;
  if (mOrders.length > 0) {
    const byCustomer: Record<string, number> = {};
    for (const o of mOrders) {
      if (!o.customer_id) continue;
      byCustomer[o.customer_id] = (byCustomer[o.customer_id] ?? 0) + 1;
    }
    const sortedC = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]);
    if (sortedC.length > 0) {
      const [cid, cnt] = sortedC[0];
      const { data: cust } = await supabase
        .from("customers")
        .select("name")
        .eq("id", cid)
        .single();
      if (cust) topCliente = { name: cust.name, pedidos: cnt };
    }
  }

  // Gráfica últimos 7 días
  const last7: { day: string; label: string; count: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayKey = isoDay(d);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayOrders = mOrders.filter((o: any) => {
      const t = new Date(o.created_at);
      return t >= d && t < next;
    });
    last7.push({
      day: dayKey,
      label: d.toLocaleDateString("es-MX", { weekday: "short" }),
      count: dayOrders.length,
      total: dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0),
    });
  }
  const maxCount = Math.max(1, ...last7.map((d) => d.count));

  // Pilot feedback
  const [{ data: pilotSetting }, { data: feedback }] = await Promise.all([
    supabase
      .from("settings")
      .select("value")
      .eq("key", "pilot_mode")
      .maybeSingle(),
    supabase
      .from("pilot_feedback")
      .select("rating, comment, page, customer_name, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const pilotOn = pilotSetting?.value === "on";
  const feedbackList = feedback ?? [];

  // Cumpleaños esta semana
  const { data: bdayCustomers } = await supabase
    .from("customers")
    .select("id, name, whatsapp, birthday, birthday_set_at")
    .not("birthday", "is", null);

  const todayMd = todayMD();
  const birthdaysThisWeek = (bdayCustomers ?? [])
    .map((c: any) => {
      const daysSinceSet = daysSinceBirthdaySet(c.birthday_set_at);
      return {
        ...c,
        daysUntil: daysUntilBirthday(c.birthday),
        isToday: c.birthday === todayMd,
        recientlyAdded: daysSinceSet < BIRTHDAY_SETTLE_DAYS,
        daysSinceSet,
      };
    })
    .filter((c: any) => c.daysUntil >= 0 && c.daysUntil <= 7)
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

  // Capacidad y ocupación próximos 7 días
  const capacity = await getCapacity(supabase);
  const hasCapacityLimit = Object.values(capacity).some(
    (v) => typeof v === "number" && v > 0
  );
  const next7Dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    next7Dates.push(isoDay(d));
  }
  const occupancies = hasCapacityLimit
    ? await getMultiDayOccupancy(supabase, next7Dates, capacity)
    : [];
  const alertDays = occupancies.filter(
    (o) => o.worstStatus === "over" || o.worstStatus === "full"
  );

  const avgRating =
    feedbackList.length > 0
      ? feedbackList.reduce((s: number, f: any) => s + f.rating, 0) /
        feedbackList.length
      : 0;
  const EMOJI: Record<number, string> = {
    1: "😞",
    2: "😐",
    3: "🙂",
    4: "😍",
  };

  // Mes y año para el botón de reporte
  const monthSlug = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mesNombre = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <main className="px-4 pt-4 pb-6">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Negocio
      </h1>
      <p className="text-xs text-canela mt-1">
        Cómo va Masa Mía hoy, esta semana y este mes.
      </p>

      {/* ═══════ Meta del mes ═══════ */}
      <section className="mt-5 bg-gradient-to-br from-cafe to-canela text-crema rounded-2xl p-5 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconTarget size={16} className="text-antojo" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-caramelo">
              Meta de {mesNombre}
            </span>
          </div>
          <span className="text-[10px] text-caramelo font-mono">
            {daysLeft} {daysLeft === 1 ? "día" : "días"} restantes
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-3xl font-bold text-crema"
            style={{ fontFamily: "Termina" }}
          >
            {pesos(ventasMes)}
          </span>
          <span className="text-sm text-caramelo">
            / {pesos(monthlyGoal)}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3 h-3 bg-cafe/40 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${metaPct}%`,
              background:
                metaPct >= 100
                  ? "linear-gradient(90deg, #5b7a3a, #7a9d4f)"
                  : "linear-gradient(90deg, #F25C20, #FF8045)",
            }}
          />
          {/* Marca de "ritmo ideal" — donde deberías estar a estas alturas del mes */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-crema/60"
            style={{
              left: `${(daysPassed / daysInMonth) * 100}%`,
            }}
            title="Donde deberías estar para ir a ritmo perfecto"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-crema font-bold">
            {metaPctReal.toFixed(0)}% completado
          </span>
          {ritmoNecesarioDiario > 0 ? (
            <span className="text-caramelo">
              {pesos(ritmoNecesarioDiario)}/día para cerrar
            </span>
          ) : (
            <span className="text-verde font-bold">🎉 Meta alcanzada</span>
          )}
        </div>

        <p className="text-xs text-crema/90 italic mt-3 leading-snug">
          🐤 {migaMsgMeta}
        </p>
      </section>

      {/* ═══════ KPIs con comparativa mes anterior ═══════ */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <KpiCard
          icon={<IconReceipt2 size={18} />}
          label="Pedidos hoy"
          value={String(todayOrders.length)}
          sub={`${pesos(ventasHoy)} vendidos`}
          tone="antojo"
        />
        <KpiCard
          icon={<IconCash size={18} />}
          label="Ventas del mes"
          value={pesos(ventasMes)}
          sub={`${mOrders.length} pedidos`}
          tone="verde"
          delta={deltaVentasMes}
          deltaSubject="vs mismo periodo mes pasado"
        />
        <KpiCard
          icon={<IconUsers size={18} />}
          label="Clientes"
          value={String(totalCustomers ?? 0)}
          sub={`+${nuevosEstaSemana ?? 0} esta semana`}
          tone="cafe"
        />
        <KpiCard
          icon={<IconTrendingUp size={18} />}
          label="Ticket promedio"
          value={mOrders.length > 0 ? pesos(ticketActual) : "$0"}
          sub="del mes"
          tone="canela"
          delta={deltaTicket}
          deltaSubject="vs mes pasado"
        />
      </div>

      {/* ═══════ Retención 30 días ═══════ */}
      <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconRepeat size={14} className="text-antojo" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-canela">
              Recurrencia · últimos 30 días
            </h2>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="text-3xl font-bold text-cafe"
            style={{ fontFamily: "Termina" }}
          >
            {retencionPct.toFixed(0)}%
          </span>
          <span className="text-xs text-canela">
            de tus clientes activos volvieron
          </span>
        </div>
        <div className="text-[11px] text-canela mt-1">
          {clientesRecurrentes} de {totalClientesActivos} clientes hicieron 2+ pedidos
        </div>
        <div
          className={`mt-3 text-[11px] px-3 py-2 rounded-xl ${
            retencionPct >= 25
              ? "bg-verde/10 text-verde"
              : retencionPct >= 10
              ? "bg-caramelo/15 text-canela"
              : "bg-rojo/10 text-rojo"
          }`}
        >
          {retencionPct >= 25 ? (
            <>
              ✓ <b>Bien</b> — tu producto engancha. Foco en sumar más clientes.
            </>
          ) : retencionPct >= 10 ? (
            <>
              ⚠ <b>Regular</b> — hay espacio para que más vuelvan. Considera
              programa de fidelidad.
            </>
          ) : (
            <>
              ✕ <b>Bajo</b> — la gente prueba pero no repite. Revisa producto y
              experiencia, no solo marketing.
            </>
          )}
        </div>
      </section>

      {/* ═══════ Alerta capacidad ═══════ */}
      {hasCapacityLimit && alertDays.length > 0 && (
        <section className="mt-3 bg-rojo/10 border-2 border-rojo/40 rounded-2xl p-4 fade-up">
          <h2 className="text-xs font-bold uppercase tracking-widest text-rojo mb-2 flex items-center gap-1">
            🚨 Atención: días apretados
          </h2>
          <ul className="space-y-2">
            {alertDays.map((day) => {
              const d = new Date(day.date + "T12:00:00");
              const isHoy = day.date === isoDay(today);
              return (
                <li key={day.date} className="bg-white rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold text-cafe capitalize"
                      style={{ fontFamily: "Termina" }}
                    >
                      {isHoy
                        ? "Hoy"
                        : d.toLocaleDateString("es-MX", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[day.worstStatus].text} bg-white border ${STATUS_STYLE[day.worstStatus].dot.replace("bg-", "border-")}`}
                    >
                      {STATUS_STYLE[day.worstStatus].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {day.rows
                      .filter(
                        (r) =>
                          r.status === "full" || r.status === "over"
                      )
                      .map((r) => (
                        <span
                          key={r.category}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status].text} bg-white border ${STATUS_STYLE[r.status].dot.replace("bg-", "border-")}`}
                        >
                          {CATEGORY_LABEL[r.category]} {r.used}/{r.limit}
                        </span>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-canela italic mt-2 text-center">
            El cliente no puede pedir más en estos días/categorías. Ajusta
            capacidad en Ajustes → Capacidad.
          </p>
        </section>
      )}

      {/* ═══════ Gráfica 7 días ═══════ */}
      <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-canela mb-3">
          Últimos 7 días
        </h2>
        <div className="flex items-end justify-between gap-1 h-32">
          {last7.map((d) => {
            const height = (d.count / maxCount) * 100;
            return (
              <div
                key={d.day}
                className="flex flex-col items-center gap-1 flex-1"
              >
                <div className="text-[10px] font-bold text-cafe">
                  {d.count}
                </div>
                <div
                  className="w-full bg-antojo/80 rounded-t-lg transition-all min-h-[3px]"
                  style={{ height: `${Math.max(2, height)}%` }}
                  title={`${d.label} · ${d.count} pedidos · ${pesos(d.total)}`}
                />
                <div className="text-[9px] text-canela capitalize">
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ Heatmap hora pico ═══════ */}
      <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-canela flex items-center gap-1">
            <IconClock size={12} /> Hora pico · últimos 30 días
          </h2>
          <span className="text-[9px] text-caramelo">cuándo entran pedidos</span>
        </div>
        <div className="min-w-[420px]">
          {/* Header de horas */}
          <div className="grid grid-cols-[28px_repeat(16,minmax(0,1fr))] gap-px text-[8px] text-canela mb-1">
            <div></div>
            {hoursToShow.map((h) => (
              <div key={h} className="text-center font-mono">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {/* Filas por día */}
          {dayLabels.map((label, dayIdx) => (
            <div
              key={label}
              className="grid grid-cols-[28px_repeat(16,minmax(0,1fr))] gap-px mb-px"
            >
              <div className="text-[9px] font-bold text-canela self-center">
                {label}
              </div>
              {hoursToShow.map((h) => {
                const count = heatmap[dayIdx][h];
                const intensity = count / heatmapMax;
                return (
                  <div
                    key={h}
                    className="aspect-square rounded-sm"
                    style={{
                      background:
                        count === 0
                          ? "rgba(172, 123, 84, 0.08)"
                          : `rgba(242, 92, 32, ${0.18 + intensity * 0.82})`,
                    }}
                    title={`${label} ${h}:00 — ${count} ${
                      count === 1 ? "pedido" : "pedidos"
                    }`}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center justify-end gap-1 mt-2 text-[8px] text-canela">
            <span>menos</span>
            <div className="flex gap-px">
              {[0.18, 0.4, 0.6, 0.8, 1].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: `rgba(242, 92, 32, ${i})` }}
                />
              ))}
            </div>
            <span>más</span>
          </div>
        </div>
      </section>

      {/* ═══════ Cumpleaños esta semana ═══════ */}
      {birthdaysThisWeek.length > 0 && (
        <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm border-2 border-antojo/20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-canela mb-3 flex items-center gap-1">
            <IconCake size={12} className="text-antojo" /> Cumpleaños esta
            semana
          </h2>
          <ul className="space-y-2">
            {birthdaysThisWeek.map((c: any) => (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${
                  c.isToday
                    ? "bg-antojo/10 border border-antojo/30"
                    : "bg-crema-soft"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-2xl">{c.isToday ? "🎂" : "🎉"}</span>
                  <div className="min-w-0">
                    <div
                      className="text-sm font-bold text-cafe truncate flex items-center gap-1"
                      style={{ fontFamily: "Termina" }}
                    >
                      {c.name}
                      {c.recientlyAdded && (
                        <span
                          title={`Agregó su cumple hace ${c.daysSinceSet} días — descuento NO aplica`}
                          className="text-[9px] bg-[#F2A516] text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        >
                          ⚠️ reciente
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-canela capitalize">
                      {c.isToday
                        ? c.recientlyAdded
                          ? "¡Es hoy! (sin rol auto)"
                          : "¡Es hoy!"
                        : c.daysUntil === 1
                          ? "mañana"
                          : `en ${c.daysUntil} días`}{" "}
                      · {formatBirthday(c.birthday)}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://wa.me/521${c.whatsapp}?text=${encodeURIComponent(
                    c.isToday
                      ? `¡Feliz cumpleaños, ${c.name}! 🎂 Hoy tienes un rol cortesía cuando armes tu antojo en Masa Mía 🤎`
                      : `¡Hola ${c.name}! Te queremos desear desde Masa Mía un adelanto: nos contó un pajarito que se viene tu cumple 🎂`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition ${
                    c.isToday
                      ? "bg-antojo text-white shadow"
                      : "bg-[#25D366] text-white"
                  }`}
                >
                  <IconBrandWhatsapp size={13} />
                  Felicitar
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════ Top productos ═══════ */}
      <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-canela mb-3 flex items-center gap-1">
          <IconFlame size={12} /> Top sabores del mes
        </h2>
        {topProducts.length === 0 ? (
          <p className="text-xs text-canela italic">
            Sin pedidos todavía este mes.
          </p>
        ) : (
          <ol className="space-y-2">
            {topProducts.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0
                        ? "bg-antojo text-white"
                        : i === 1
                        ? "bg-caramelo text-white"
                        : "bg-crema text-cafe"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-sm font-bold text-cafe truncate"
                    style={{ fontFamily: "Termina" }}
                  >
                    {p.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-antojo">
                  {p.qty}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ═══════ Feedback piloto ═══════ */}
      {pilotOn && (
        <section className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-canela mb-3 flex items-center gap-1">
            <IconMessageHeart size={12} /> Feedback piloto ·{" "}
            {feedbackList.length > 0 && (
              <span className="text-antojo">
                ⭐ {avgRating.toFixed(1)}
              </span>
            )}
          </h2>
          {feedbackList.length === 0 ? (
            <p className="text-xs text-canela italic">
              Aún sin feedback. Comparte códigos con tus testers 🤎
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {feedbackList.map((f: any, idx: number) => (
                <li
                  key={idx}
                  className="border-b border-caramelo/20 pb-2 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{EMOJI[f.rating] ?? "🙂"}</span>
                      <span
                        className="text-xs font-bold text-cafe"
                        style={{ fontFamily: "Termina" }}
                      >
                        {f.customer_name || "Anónimo"}
                      </span>
                    </div>
                    <span className="text-[9px] text-canela">
                      {f.page}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="text-xs text-canela italic mt-1 pl-7">
                      "{f.comment}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ═══════ Cliente del mes ═══════ */}
      {topCliente && (
        <section className="mt-3 bg-gradient-to-br from-antojo to-[#E04A18] text-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-3">
              <IconCrown size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                Cliente del mes
              </div>
              <div
                className="text-xl leading-none mt-1"
                style={{ fontFamily: "ReginaBlack" }}
              >
                {topCliente.name}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {topCliente.pedidos} pedidos este mes 🤎
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ Botón reporte del mes ═══════ */}
      <Link
        href={`/staff/reporte/${monthSlug}`}
        className="mt-5 w-full bg-cafe text-crema rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
      >
        <IconFileText size={16} />
        Ver reporte de {now.toLocaleDateString("es-MX", { month: "long" })}
      </Link>
      <p className="text-[10px] text-canela text-center mt-2 italic">
        Vista para imprimir o guardar como PDF (1 página).
      </p>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
  delta,
  deltaSubject,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "antojo" | "verde" | "cafe" | "canela";
  delta?: number | null;
  deltaSubject?: string;
}) {
  const toneClass =
    tone === "antojo"
      ? "text-antojo"
      : tone === "verde"
      ? "text-verde"
      : tone === "cafe"
      ? "text-cafe"
      : "text-canela";
  const showDelta = typeof delta === "number" && Math.abs(delta) >= 0.5;
  const isUp = (delta ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className={`flex items-center gap-1.5 ${toneClass}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div
        className={`text-2xl font-bold mt-1 ${toneClass}`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[10px] text-canela mt-0.5 flex items-center gap-1 flex-wrap">
        <span>{sub}</span>
        {showDelta && (
          <span
            className={`inline-flex items-center gap-0.5 font-bold ${
              isUp ? "text-verde" : "text-rojo"
            }`}
            title={deltaSubject}
          >
            {isUp ? (
              <IconArrowUpRight size={10} stroke={3} />
            ) : (
              <IconArrowDownRight size={10} stroke={3} />
            )}
            {Math.abs(delta ?? 0).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
