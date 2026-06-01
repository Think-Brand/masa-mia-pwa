import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase-server";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const DEFAULT_MONTHLY_GOAL_MXN = 8000;

type Props = { params: { mes: string } };

/** Parse "YYYY-MM" → { year, month (0-indexed) } o null si inválido. */
function parseMonthSlug(slug: string): { year: number; month: number } | null {
  const m = slug.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (year < 2020 || year > 2100) return null;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual > 0 ? 100 : null;
  return ((actual - anterior) / anterior) * 100;
}

export default async function ReportePage({ params }: Props) {
  const parsed = parseMonthSlug(params.mes);
  if (!parsed) notFound();
  const { year, month } = parsed;

  const supabase = createClient();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(year, month - 1, 1);
  const prevMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // ─── Datos del mes y mes anterior en paralelo ─────────────────
  const [
    { data: monthOrders },
    { data: prevMonthOrders },
    { count: newCustomers },
    { count: totalCustomers },
    { data: goalSetting },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, created_at, customer_id, status")
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase
      .from("orders")
      .select("id, total, created_at, customer_id")
      .gte("created_at", prevMonthStart.toISOString())
      .lte("created_at", prevMonthEnd.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString()),
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

  const ventas = mOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
  const ventasPrev = pmOrders.reduce(
    (s: number, o: any) => s + Number(o.total),
    0
  );
  const numPedidos = mOrders.length;
  const numPedidosPrev = pmOrders.length;
  const ticket = numPedidos > 0 ? ventas / numPedidos : 0;
  const ticketPrev = numPedidosPrev > 0 ? ventasPrev / numPedidosPrev : 0;
  const metaPct = (ventas / monthlyGoal) * 100;

  // ─── Top 5 productos ─────────────────
  const orderIds = mOrders.map((o: any) => o.id);
  let topProducts: { name: string; qty: number; revenue: number }[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .in("order_id", orderIds);
    const acc: Record<string, { qty: number; revenue: number }> = {};
    for (const it of items ?? []) {
      const nombre = (it.product_name as string).split(" [")[0];
      if (!acc[nombre]) acc[nombre] = { qty: 0, revenue: 0 };
      acc[nombre].qty += it.quantity ?? 0;
      acc[nombre].revenue +=
        (it.quantity ?? 0) * Number(it.unit_price ?? 0);
    }
    topProducts = Object.entries(acc)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  // ─── Top 5 clientes ─────────────────
  let topCustomers: { name: string; pedidos: number; gastado: number }[] = [];
  if (mOrders.length > 0) {
    const acc: Record<string, { pedidos: number; gastado: number }> = {};
    for (const o of mOrders) {
      if (!o.customer_id) continue;
      if (!acc[o.customer_id]) acc[o.customer_id] = { pedidos: 0, gastado: 0 };
      acc[o.customer_id].pedidos += 1;
      acc[o.customer_id].gastado += Number(o.total);
    }
    const sorted = Object.entries(acc)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.gastado - a.gastado)
      .slice(0, 5);
    const ids = sorted.map((s) => s.id);
    const { data: custs } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", ids);
    const nameMap = new Map<string, string>(
      (custs ?? []).map((c: any) => [c.id, c.name])
    );
    topCustomers = sorted.map((s) => ({
      name: nameMap.get(s.id) ?? "—",
      pedidos: s.pedidos,
      gastado: s.gastado,
    }));
  }

  // ─── Nuevos vs recurrentes ─────────────────
  const customersThisMonth = new Set(
    mOrders.filter((o: any) => o.customer_id).map((o: any) => o.customer_id)
  );
  let recurrentes = 0;
  let nuevos = 0;
  if (customersThisMonth.size > 0) {
    const { data: firstOrders } = await supabase
      .from("orders")
      .select("customer_id, created_at")
      .in("customer_id", Array.from(customersThisMonth));
    const firstByCustomer = new Map<string, Date>();
    for (const o of firstOrders ?? []) {
      const cid = (o as any).customer_id as string;
      const d = new Date((o as any).created_at);
      const prev = firstByCustomer.get(cid);
      if (!prev || d < prev) firstByCustomer.set(cid, d);
    }
    for (const cid of customersThisMonth) {
      const first = firstByCustomer.get(cid);
      if (!first) continue;
      if (first >= monthStart) nuevos += 1;
      else recurrentes += 1;
    }
  }

  // ─── Día con más pedidos ─────────────────
  const ordersByDay: Record<string, number> = {};
  for (const o of mOrders) {
    const day = new Date(o.created_at).toISOString().slice(0, 10);
    ordersByDay[day] = (ordersByDay[day] ?? 0) + 1;
  }
  const dayEntries = Object.entries(ordersByDay).sort((a, b) => b[1] - a[1]);
  const diaTop = dayEntries.length > 0 ? dayEntries[0] : null;

  // ─── Deltas ─────────────────
  const dVentas = deltaPct(ventas, ventasPrev);
  const dPedidos = deltaPct(numPedidos, numPedidosPrev);
  const dTicket = deltaPct(ticket, ticketPrev);

  const mesNombre = monthStart.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  const prevMesNombre = prevMonthStart.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  // Mes anterior y siguiente para navegación
  const prevSlug = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, "0")}`;
  const nextDate = new Date(year, month + 1, 1);
  const nextSlug = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  const isFutureMonth =
    nextDate.getTime() > new Date().getTime() - 30 * 24 * 3600 * 1000 &&
    monthStart.getFullYear() === new Date().getFullYear() &&
    monthStart.getMonth() === new Date().getMonth();

  return (
    <main className="px-4 pt-4 pb-12 max-w-2xl mx-auto">
      {/* Toolbar — no se imprime */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/staff/dashboard"
          className="text-canela flex items-center gap-1.5 text-xs font-bold active:scale-95"
        >
          <IconArrowLeft size={16} />
          Negocio
        </Link>
        <PrintButton />
      </div>

      {/* Nav meses — no se imprime */}
      <div className="flex items-center justify-between mb-4 print:hidden text-xs">
        <Link
          href={`/staff/reporte/${prevSlug}`}
          className="text-canela font-bold active:scale-95"
        >
          ← {prevMesNombre}
        </Link>
        {!isFutureMonth && (
          <Link
            href={`/staff/reporte/${nextSlug}`}
            className="text-canela font-bold active:scale-95"
          >
            {nextDate.toLocaleDateString("es-MX", {
              month: "long",
              year: "numeric",
            })}{" "}
            →
          </Link>
        )}
      </div>

      {/* ═══════ Reporte (imprimible) ═══════ */}
      <article className="bg-white rounded-2xl p-8 shadow-sm print:shadow-none print:p-0">
        {/* Header */}
        <header className="border-b border-cafe/15 pb-4 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-canela">
            Reporte mensual · Masa Mía
          </div>
          <h1
            className="text-3xl text-cafe leading-none mt-1 capitalize"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {mesNombre}
          </h1>
        </header>

        {/* Resumen ejecutivo */}
        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-canela mb-3">
            Resumen ejecutivo
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Cell
              label="Ventas totales"
              value={pesos(ventas)}
              delta={dVentas}
              big
            />
            <Cell
              label="Pedidos"
              value={String(numPedidos)}
              delta={dPedidos}
              big
            />
            <Cell label="Ticket promedio" value={pesos(ticket)} delta={dTicket} />
            <Cell
              label="vs meta del mes"
              value={`${metaPct.toFixed(0)}%`}
              sub={`meta: ${pesos(monthlyGoal)}`}
            />
            <Cell label="Clientes nuevos" value={String(nuevos)} />
            <Cell label="Clientes recurrentes" value={String(recurrentes)} />
          </div>
        </section>

        {/* Top productos */}
        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-canela mb-3">
            Top 5 sabores · qué jaló más
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-canela italic">Sin pedidos este mes.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-canela border-b border-cafe/10">
                  <th className="text-left py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    #
                  </th>
                  <th className="text-left py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Producto
                  </th>
                  <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Unidades
                  </th>
                  <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Ingreso
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr
                    key={p.name}
                    className="border-b border-cafe/5 last:border-0"
                  >
                    <td className="py-1.5 text-canela">{i + 1}</td>
                    <td
                      className="py-1.5 text-cafe font-bold"
                      style={{ fontFamily: "Termina" }}
                    >
                      {p.name}
                    </td>
                    <td className="py-1.5 text-right text-cafe">{p.qty}</td>
                    <td className="py-1.5 text-right text-cafe font-bold">
                      {pesos(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Top clientes */}
        {topCustomers.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-canela mb-3">
              Top 5 clientes · quién compra más
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-canela border-b border-cafe/10">
                  <th className="text-left py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Cliente
                  </th>
                  <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Pedidos
                  </th>
                  <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                    Gastado
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-cafe/5 last:border-0"
                  >
                    <td
                      className="py-1.5 text-cafe font-bold"
                      style={{ fontFamily: "Termina" }}
                    >
                      {c.name}
                    </td>
                    <td className="py-1.5 text-right text-cafe">{c.pedidos}</td>
                    <td className="py-1.5 text-right text-cafe font-bold">
                      {pesos(c.gastado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Highlights */}
        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-canela mb-3">
            Highlights del mes
          </h2>
          <ul className="text-xs text-cafe space-y-1.5">
            {diaTop && (
              <li>
                • Día más fuerte:{" "}
                <b>
                  {new Date(diaTop[0] + "T12:00:00").toLocaleDateString(
                    "es-MX",
                    { weekday: "long", day: "numeric", month: "long" }
                  )}
                </b>{" "}
                con {diaTop[1]} {diaTop[1] === 1 ? "pedido" : "pedidos"}.
              </li>
            )}
            <li>
              • Base total de clientes: <b>{totalCustomers ?? 0}</b> · este mes
              llegaron <b>{newCustomers ?? 0}</b> nuevos.
            </li>
            {topProducts[0] && (
              <li>
                • Sabor estrella: <b>{topProducts[0].name}</b> con{" "}
                {topProducts[0].qty} unidades vendidas.
              </li>
            )}
            {dVentas !== null && (
              <li>
                • Ventas {dVentas >= 0 ? "crecieron" : "bajaron"}{" "}
                <b>{Math.abs(dVentas).toFixed(0)}%</b> vs {prevMesNombre}.
              </li>
            )}
          </ul>
        </section>

        {/* Comparativa con mes anterior */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-canela mb-3">
            Comparativa con {prevMesNombre}
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-canela border-b border-cafe/10">
                <th className="text-left py-1.5 font-bold uppercase text-[9px] tracking-wider">
                  Métrica
                </th>
                <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                  Este mes
                </th>
                <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                  Mes pasado
                </th>
                <th className="text-right py-1.5 font-bold uppercase text-[9px] tracking-wider">
                  Δ
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                label="Ventas"
                actual={pesos(ventas)}
                prev={pesos(ventasPrev)}
                delta={dVentas}
              />
              <CompareRow
                label="Pedidos"
                actual={String(numPedidos)}
                prev={String(numPedidosPrev)}
                delta={dPedidos}
              />
              <CompareRow
                label="Ticket promedio"
                actual={pesos(ticket)}
                prev={pesos(ticketPrev)}
                delta={dTicket}
              />
            </tbody>
          </table>
        </section>

        <footer className="mt-8 pt-4 border-t border-cafe/10 text-[10px] text-canela italic text-center">
          Generado el{" "}
          {new Date().toLocaleString("es-MX", {
            dateStyle: "long",
            timeStyle: "short",
          })}{" "}
          · Masa Mía · masamia.mx
        </footer>
      </article>
    </main>
  );
}

function Cell({
  label,
  value,
  sub,
  delta,
  big = false,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  big?: boolean;
}) {
  const showDelta = typeof delta === "number" && Math.abs(delta) >= 0.5;
  const isUp = (delta ?? 0) >= 0;
  return (
    <div className="border border-cafe/10 rounded-xl p-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-canela">
        {label}
      </div>
      <div
        className={`text-cafe font-bold mt-1 ${big ? "text-2xl" : "text-lg"}`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[10px] text-canela mt-0.5 flex items-center gap-1">
        {sub && <span>{sub}</span>}
        {showDelta && (
          <span
            className={`font-bold ${isUp ? "text-verde" : "text-rojo"}`}
          >
            {isUp ? "↑" : "↓"} {Math.abs(delta ?? 0).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  actual,
  prev,
  delta,
}: {
  label: string;
  actual: string;
  prev: string;
  delta: number | null;
}) {
  const showDelta = typeof delta === "number" && Math.abs(delta) >= 0.5;
  const isUp = (delta ?? 0) >= 0;
  return (
    <tr className="border-b border-cafe/5 last:border-0">
      <td
        className="py-1.5 text-cafe font-bold"
        style={{ fontFamily: "Termina" }}
      >
        {label}
      </td>
      <td className="py-1.5 text-right text-cafe">{actual}</td>
      <td className="py-1.5 text-right text-canela">{prev}</td>
      <td
        className={`py-1.5 text-right font-bold ${
          showDelta
            ? isUp
              ? "text-verde"
              : "text-rojo"
            : "text-canela"
        }`}
      >
        {showDelta ? `${isUp ? "↑" : "↓"} ${Math.abs(delta ?? 0).toFixed(0)}%` : "—"}
      </td>
    </tr>
  );
}
