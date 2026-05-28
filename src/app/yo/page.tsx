"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import Miga from "@/components/Miga";

type Stats = {
  totalOrders: number;
  totalSpent: number;
  favoriteProduct: string | null;
};

export default function Yo() {
  const router = useRouter();
  const { cliente, clear, setCliente, items } = useCarrito();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) {
      router.replace("/");
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total")
        .eq("customer_id", cliente.id)
        .neq("status", "declined")
        .neq("status", "cancelled");

      let favoriteProduct: string | null = null;
      if (orders && orders.length > 0) {
        const orderIds = orders.map((o: { id: string }) => o.id);
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity")
          .in("order_id", orderIds);
        const counts: Record<string, number> = {};
        for (const it of items ?? []) {
          const nombre = (it.product_name as string).split(" [")[0];
          counts[nombre] = (counts[nombre] ?? 0) + (it.quantity ?? 0);
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) favoriteProduct = sorted[0][0];
      }

      setStats({
        totalOrders: orders?.length ?? 0,
        totalSpent: (orders ?? []).reduce(
          (s, o) => s + Number(o.total),
          0
        ),
        favoriteProduct,
      });
      setLoading(false);
    })();
  }, [cliente, router]);

  const cambiarPersona = () => {
    if (items.length > 0) {
      if (!confirm("Tienes productos en tu antojo. ¿Limpiar y cambiar de persona?"))
        return;
    }
    clear();
    setCliente({ name: "", whatsapp: "" });
    localStorage.removeItem("masamia:cliente");
    router.replace("/");
  };

  if (!cliente) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur px-4 py-3 border-b border-caramelo/20">
        <h1
          className="text-2xl text-cafe text-center"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Yo
        </h1>
      </header>

      <div className="flex-1 px-4 pt-6 flex flex-col items-center text-center gap-4">
        <Miga pose="adorable" animation="bounce" size={140} priority />
        <div>
          <div
            className="text-2xl text-cafe leading-none"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Hola, {cliente.name}
          </div>
          <div className="text-xs text-canela mt-1">
            {cliente.whatsapp.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3")}
          </div>
        </div>

        {/* Stats card */}
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
          {loading ? (
            <div className="text-canela text-sm">Calculando tu antojo…</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Stat
                value={String(stats?.totalOrders ?? 0)}
                label="pedidos"
              />
              <Stat
                value={`$${(stats?.totalSpent ?? 0).toFixed(0)}`}
                label="gastado"
              />
              <Stat
                value={stats?.favoriteProduct ?? "—"}
                label="favorito"
                small
              />
            </div>
          )}
        </div>

        {/* Mensajes contextuales */}
        {!loading && stats && stats.totalOrders === 0 && (
          <p className="text-xs text-canela italic">
            Tu antojo apenas empieza. Pásate al menú 🥖
          </p>
        )}
        {!loading && stats && stats.totalOrders >= 1 && stats.totalOrders < 3 && (
          <p className="text-xs text-canela italic">
            Bienvenida a Masa Mía. La próxima vez ni te vas a registrar 🤎
          </p>
        )}
        {!loading && stats && stats.totalOrders >= 3 && (
          <p className="text-xs text-canela italic">
            Ya eres de la familia. Gracias por tu antojo 🤎
          </p>
        )}

        <div className="flex-1" />

        <button
          onClick={cambiarPersona}
          className="text-xs text-canela underline flex items-center gap-1 mt-4"
        >
          <IconLogout size={14} />
          ¿No eres tú? Cambiar de persona
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({
  value,
  label,
  small = false,
}: {
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${small ? "text-xs" : "text-lg"} font-bold text-antojo ${small ? "" : ""}`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[10px] text-canela mt-0.5">{label}</div>
    </div>
  );
}
