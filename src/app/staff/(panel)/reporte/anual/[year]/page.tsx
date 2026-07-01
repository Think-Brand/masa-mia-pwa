import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase-server";
import PrintButton from "../../[mes]/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: { year: string } };

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual > 0 ? 100 : null;
  return ((actual - anterior) / anterior) * 100;
}

export default async function ReporteAnualPage({ params }: Props) {
  const year = Number(params.year);
  if (!/^\d{4}$/.test(params.year) || year < 2020 || year > 2100) notFound();

  const supabase = createClient();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const prevYearStart = new Date(year - 1, 0, 1);
  const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

  const [
    { data: yearOrders },
    { data: prevYearOrders },
    { count: newCustomers },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, created_at")
      .gte("created_at", yearStart.toISOString())
      .lte("created_at", yearEnd.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase
      .from("orders")
      .select("id, total")
      .gte("created_at", prevYearStart.toISOString())
      .lte("created_at", prevYearEnd.toISOString())
      .neq("status", "cancelled")
      .neq("status", "declined"),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yearStart.toISOString())
      .lte("created_at", yearEnd.toISOString()),
  ]);

  const orders = yearOrders ?? [];

  // Agregación por mes (America/Mexico_City para no desfasar el mes)
  const ventasMes = new Array(12).fill(0);
  const pedidosMes = new Array(12).fill(0);
  for (const o of orders) {
    const d = new Date(
      new Date(o.created_at).toLocaleString("en-US", {
        timeZone: "America/Mexico_City",
      })
    );
    const mi = d.getMonth();
    ventasMes[mi] += Number(o.total);
    pedidosMes[mi] += 1;
  }

  const ventasAnio = ventasMes.reduce((s, v) => s + v, 0);
  const pedidosAnio = pedidosMes.reduce((s, v) => s + v, 0);
  const ticketAnio = pedidosAnio > 0 ? ventasAnio / pedidosAnio : 0;

  const ventasPrev = (prevYearOrders ?? []).reduce(
    (s: number, o: any) => s + Number(o.total),
    0
  );
  const pedidosPrev = (prevYearOrders ?? []).length;
  const dVentas = deltaPct(ventasAnio, ventasPrev);
  const dPedidos = deltaPct(pedidosAnio, pedidosPrev);

  // Mejor mes por ventas (solo entre meses con ventas)
  let mejorMesIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (ventasMes[i] > 0 && (mejorMesIdx === -1 || ventasMes[i] > ventasMes[mejorMesIdx])) {
      mejorMesIdx = i;
    }
  }

  const thisYear = new Date().getFullYear();
  const haySiguiente = year < thisYear;

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

      {/* Nav de año — no se imprime */}
      <div className="flex items-center justify-between mb-4 print:hidden text-xs">
        <Link
          href={`/staff/reporte/anual/${year - 1}`}
          className="text-canela font-bold active:scale-95"
        >
          ← {year - 1}
        </Link>
        <span className="text-canela font-bold">Resumen anual</span>
        {haySiguiente ? (
          <Link
            href={`/staff/reporte/anual/${year + 1}`}
            className="text-canela font-bold active:scale-95"
          >
            {year + 1} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* ═══════ Reporte (imprimible) ═══════ */}
      <article className="bg-white rounded-2xl p-8 shadow-sm print:shadow-none print:p-0">
        {/* Header */}
        <header className="border-b border-cafe/15 pb-4 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-canela">
            Reporte anual · Masa Mía
          </div>
          <h1
            className="text-3xl text-cafe leading-none mt-1"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {year}
          </h1>
        </header>

        {/* Resumen ejecutivo del año */}
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-canela mb-3">
            Resumen del año
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Cell label="Ventas del año" value={pesos(ventasAnio)} delta={dVentas} big />
            <Cell label="Pedidos del año" value={String(pedidosAnio)} delta={dPedidos} big />
            <Cell label="Ticket promedio" value={pesos(ticketAnio)} />
            <Cell label="Clientes nuevos" value={String(newCustomers ?? 0)} />
          </div>
          {mejorMesIdx >= 0 && (
            <p className="text-[11px] text-canela mt-3">
              Mejor mes:{" "}
              <span className="font-bold text-cafe">
                {MESES_CORTOS[mejorMesIdx]} ({pesos(ventasMes[mejorMesIdx])})
              </span>
            </p>
          )}
        </section>

        {/* Desglose mes por mes */}
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-canela mb-3">
            Mes por mes
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-canela border-b border-cafe/10">
                <th className="text-left py-1.5 font-bold">Mes</th>
                <th className="text-right py-1.5 font-bold">Ventas</th>
                <th className="text-right py-1.5 font-bold">Pedidos</th>
                <th className="text-right py-1.5 font-bold">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {MESES_CORTOS.map((nombre, i) => {
                const v = ventasMes[i];
                const p = pedidosMes[i];
                const t = p > 0 ? v / p : 0;
                const esMejor = i === mejorMesIdx;
                return (
                  <tr
                    key={i}
                    className={`border-b border-cafe/5 last:border-0 ${
                      esMejor ? "bg-antojo/5" : ""
                    }`}
                  >
                    <td
                      className="py-1.5 text-cafe font-bold"
                      style={{ fontFamily: "Termina" }}
                    >
                      {nombre}
                    </td>
                    <td className="py-1.5 text-right text-cafe">{pesos(v)}</td>
                    <td className="py-1.5 text-right text-canela">{p}</td>
                    <td className="py-1.5 text-right text-canela">{pesos(t)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-cafe/20">
                <td
                  className="py-2 text-cafe font-bold"
                  style={{ fontFamily: "Termina" }}
                >
                  Total
                </td>
                <td className="py-2 text-right text-cafe font-bold">
                  {pesos(ventasAnio)}
                </td>
                <td className="py-2 text-right text-cafe font-bold">
                  {pedidosAnio}
                </td>
                <td className="py-2 text-right text-cafe font-bold">
                  {pesos(ticketAnio)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <footer className="mt-8 pt-4 border-t border-cafe/10 text-[11px] text-canela italic text-center">
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
  delta,
  big = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  big?: boolean;
}) {
  const showDelta = typeof delta === "number" && Math.abs(delta) >= 0.5;
  const isUp = (delta ?? 0) >= 0;
  return (
    <div className="border border-cafe/10 rounded-xl p-3">
      <div className="text-[11px] font-bold uppercase tracking-widest text-canela">
        {label}
      </div>
      <div
        className={`text-cafe font-bold mt-1 ${big ? "text-2xl" : "text-lg"}`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      {showDelta && (
        <div className="text-[11px] mt-0.5">
          <span className={`font-bold ${isUp ? "text-verde" : "text-rojo"}`}>
            {isUp ? "↑" : "↓"} {Math.abs(delta ?? 0).toFixed(0)}% vs año anterior
          </span>
        </div>
      )}
    </div>
  );
}
