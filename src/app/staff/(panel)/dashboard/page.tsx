import { createClient } from "@/lib/supabase-server";
import {
  IconReceipt2,
  IconCash,
  IconTrendingUp,
  IconUsers,
  IconFlame,
  IconCrown,
  IconMessageHeart,
} from "@tabler/icons-react";

export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Todos los pedidos válidos del mes
  const { data: monthOrders } = await supabase
    .from("orders")
    .select("id, total, created_at, status, customer_id")
    .gte("created_at", monthStart.toISOString())
    .neq("status", "cancelled")
    .neq("status", "declined");

  const mOrders = monthOrders ?? [];
  const todayOrders = mOrders.filter(
    (o: any) => new Date(o.created_at) >= today
  );

  const ventasMes = mOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const ventasHoy = todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0);

  // Total de clientes registrados
  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  // Clientes nuevos esta semana
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: nuevosEstaSemana } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString());

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

  // Cliente más fiel
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

  return (
    <main className="px-4 pt-4">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Datos
      </h1>
      <p className="text-xs text-canela mt-1">
        Cómo va Masa Mía hoy, esta semana y este mes.
      </p>

      {/* KPIs grandes */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <KpiCard
          icon={<IconReceipt2 size={18} />}
          label="Pedidos hoy"
          value={String(todayOrders.length)}
          sub={`$${ventasHoy.toFixed(0)} vendidos`}
          tone="antojo"
        />
        <KpiCard
          icon={<IconCash size={18} />}
          label="Ventas del mes"
          value={`$${ventasMes.toFixed(0)}`}
          sub={`${mOrders.length} pedidos`}
          tone="verde"
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
          label="Promedio pedido"
          value={
            mOrders.length > 0
              ? `$${(ventasMes / mOrders.length).toFixed(0)}`
              : "$0"
          }
          sub="ticket del mes"
          tone="canela"
        />
      </div>

      {/* Gráfica 7 días */}
      <section className="mt-5 bg-white rounded-2xl p-4 shadow-sm">
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
                  title={`${d.label} · ${d.count} pedidos · $${d.total.toFixed(0)}`}
                />
                <div className="text-[9px] text-canela capitalize">
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top productos */}
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

      {/* Feedback del piloto */}
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

      {/* Cliente más fiel */}
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
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "antojo" | "verde" | "cafe" | "canela";
}) {
  const toneClass =
    tone === "antojo"
      ? "text-antojo"
      : tone === "verde"
      ? "text-verde"
      : tone === "cafe"
      ? "text-cafe"
      : "text-canela";
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
      <div className="text-[10px] text-canela mt-0.5">{sub}</div>
    </div>
  );
}
