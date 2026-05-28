"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout, IconCheck } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import Miga, { MigaPose } from "@/components/Miga";

const POSES: MigaPose[] = [
  "adorable",
  "tierna",
  "chef",
  "lista",
  "senalar",
  "cintura",
  "algo-entre-manos",
  "espalda",
  "malabares",
  "sentada",
];

type Stats = {
  totalOrders: number;
  favoriteProduct: string | null;
  memberSince: string | null;
};

export default function Yo() {
  const router = useRouter();
  const { cliente, clear, setCliente, items } = useCarrito();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentPose: MigaPose = (cliente?.avatar_pose as MigaPose) || "adorable";

  useEffect(() => {
    if (!cliente) {
      router.replace("/");
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("customer_id", cliente.id)
        .neq("status", "declined")
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });

      let favoriteProduct: string | null = null;
      let memberSince: string | null = null;
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

        const first = new Date(orders[0].created_at);
        memberSince = first.toLocaleDateString("es-MX", {
          month: "long",
          year: "numeric",
        });
      }

      setStats({
        totalOrders: orders?.length ?? 0,
        favoriteProduct,
        memberSince,
      });
      setLoading(false);
    })();
  }, [cliente, router]);

  const cambiarPose = async (pose: MigaPose) => {
    if (!cliente?.id) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ avatar_pose: pose })
      .eq("id", cliente.id);
    setCliente({ ...cliente, avatar_pose: pose });
    setPickerOpen(false);
    setSaving(false);
  };

  const cambiarPersona = () => {
    if (items.length > 0) {
      if (
        !confirm(
          "Tienes productos en tu antojo. ¿Limpiar y cambiar de persona?"
        )
      )
        return;
    }
    clear();
    localStorage.removeItem("masamia:cliente");
    setCliente({ name: "", whatsapp: "" });
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
        {/* Avatar clickeable */}
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Cambiar avatar"
          className="relative"
        >
          <Miga
            pose={currentPose}
            animation="bounce"
            size={140}
            priority
            interactive={false}
          />
          <span className="absolute bottom-1 right-1 bg-antojo text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            cambiar
          </span>
        </button>

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

        {/* Stats sin dinero */}
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
                value={stats?.favoriteProduct ?? "—"}
                label="favorito"
                small
              />
              <Stat
                value={stats?.memberSince ?? "—"}
                label="con nosotros desde"
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

      {/* Modal selector de pose */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-cafe/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl p-4 pb-8 fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-4" />
            <h2
              className="text-xl text-cafe text-center mb-1"
              style={{ fontFamily: "ReginaBlack" }}
            >
              Elige tu Miga
            </h2>
            <p className="text-[11px] text-canela text-center mb-4">
              Cuál te representa hoy.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {POSES.map((pose) => {
                const active = pose === currentPose;
                return (
                  <button
                    key={pose}
                    onClick={() => cambiarPose(pose)}
                    disabled={saving}
                    className={`relative bg-white rounded-2xl p-2 transition ${
                      active ? "ring-2 ring-antojo shadow-md" : "shadow-sm"
                    }`}
                  >
                    <Image
                      src={`/mascota/miga-${pose}.png`}
                      alt={`Miga ${pose}`}
                      width={120}
                      height={120}
                      className="w-full aspect-square object-contain"
                    />
                    {active && (
                      <span className="absolute top-1 right-1 bg-antojo text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <IconCheck size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
        className={`${small ? "text-[11px]" : "text-lg"} font-bold text-antojo text-center leading-tight capitalize`}
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[9px] text-canela mt-0.5 text-center leading-tight">
        {label}
      </div>
    </div>
  );
}
