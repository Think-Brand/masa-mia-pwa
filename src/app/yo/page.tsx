"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout, IconCheck, IconCamera, IconSparkles } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import ClienteOnboarding from "@/components/ClienteOnboarding";
import { resetTour, CLIENTE_TOUR_ID } from "@/lib/onboarding";

// 10 avatares + opción de foto propia (data URL guardada en avatar_pose)
const AVATAR_IDS = Array.from({ length: 10 }, (_, i) => `avatar-${i + 1}`);

function getAvatarSrc(pose: string | undefined): string {
  if (!pose) return "/avatares/avatar-1.png";
  if (pose.startsWith("data:")) return pose; // foto propia
  if (pose.startsWith("avatar-")) return `/avatares/${pose}.png`;
  // legacy: pose tipo "adorable" → cae al primer avatar
  return "/avatares/avatar-1.png";
}

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
  const [showTour, setShowTour] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verTourDeNuevo = () => {
    resetTour(CLIENTE_TOUR_ID);
    setShowTour(true);
  };

  const currentAvatar = cliente?.avatar_pose;

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

  const cambiarAvatar = async (pose: string) => {
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

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La foto debe pesar menos de 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Comprimir a 400x400 con canvas para no guardar imágenes gigantes
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        // Crop cuadrado centrado
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        cambiarAvatar(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-28">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur px-4 py-3 border-b border-caramelo/20">
        <h1
          className="text-2xl text-cafe text-center"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Yo
        </h1>
      </header>

      <div className="flex-1 px-4 pt-6 flex flex-col items-center text-center gap-4">
        {/* Avatar circular clickeable */}
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Cambiar avatar"
          className="relative active:scale-95 transition"
        >
          <div className="w-32 h-32 rounded-full overflow-hidden bg-crema-soft shadow-md">
            <Image
              src={getAvatarSrc(currentAvatar)}
              alt="Tu avatar"
              width={256}
              height={256}
              className="w-full h-full object-cover"
              priority
              unoptimized={currentAvatar?.startsWith("data:")}
            />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-antojo text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow whitespace-nowrap">
            cambiar
          </span>
        </button>

        <div className="mt-2">
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

        <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
          {loading ? (
            <div className="text-canela text-sm">Calculando tu antojo…</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Stat value={String(stats?.totalOrders ?? 0)} label="pedidos" />
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
          onClick={verTourDeNuevo}
          className="text-xs text-cafe bg-white border border-caramelo/40 rounded-full px-4 py-2 flex items-center gap-1.5 mt-4 active:scale-95 transition shadow-sm"
        >
          <IconSparkles size={14} className="text-antojo" />
          Ver tutorial otra vez
        </button>

        <button
          onClick={cambiarPersona}
          className="text-xs text-canela underline flex items-center gap-1 mt-2"
        >
          <IconLogout size={14} />
          ¿No eres tú? Cambiar de persona
        </button>
      </div>

      {/* Tour bajo demanda (forceShow ignora pilot_mode) */}
      {showTour && (
        <ClienteOnboarding
          forceShow
          onClose={() => setShowTour(false)}
        />
      )}

      {/* Modal selector de avatar */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-cafe/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl p-4 pb-8 fade-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-4" />
            <h2
              className="text-xl text-cafe text-center mb-1"
              style={{ fontFamily: "ReginaBlack" }}
            >
              Elige tu avatar
            </h2>
            <p className="text-[11px] text-canela text-center mb-4">
              Cuál te representa hoy.
            </p>

            {/* Subir foto propia */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 mb-4 shadow-sm active:scale-[0.98] transition"
            >
              <div className="w-12 h-12 rounded-full bg-antojo/10 flex items-center justify-center text-antojo">
                <IconCamera size={22} />
              </div>
              <div className="flex-1 text-left">
                <div
                  className="text-sm font-bold text-cafe"
                  style={{ fontFamily: "Termina" }}
                >
                  Subir mi foto
                </div>
                <div className="text-[10px] text-canela">
                  Desde tu galería o cámara
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPickFile}
              className="hidden"
            />

            <div className="text-[10px] font-bold text-canela uppercase tracking-wider mb-2">
              O elige una Miga
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_IDS.map((id) => {
                const active = id === currentAvatar;
                return (
                  <button
                    key={id}
                    onClick={() => cambiarAvatar(id)}
                    disabled={saving}
                    className={`relative bg-white rounded-2xl overflow-hidden transition ${
                      active ? "ring-2 ring-antojo shadow-md" : "shadow-sm"
                    }`}
                  >
                    <Image
                      src={`/avatares/${id}.png`}
                      alt={id}
                      width={150}
                      height={150}
                      className="w-full aspect-square object-cover"
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
