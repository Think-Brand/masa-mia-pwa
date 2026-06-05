"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconLogout,
  IconCheck,
  IconCamera,
  IconSparkles,
  IconCake,
  IconChevronRight,
  IconPlus,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import ClienteOnboarding from "@/components/ClienteOnboarding";
import CumpleModal from "@/components/CumpleModal";
import YoRegistroEmptyState from "@/components/YoRegistroEmptyState";
import { resetTour, CLIENTE_TOUR_ID } from "@/lib/onboarding";
import { formatBirthday, isBirthdayToday } from "@/lib/birthday";

// Avatares + opción de foto propia (data URL). Source of truth en lib/avatar.
import { AVATAR_IDS, getAvatarSrc } from "@/lib/avatar";

type FavoriteInfo = {
  name: string;
  image_url: string | null;
  count: number;
};

type RecentOrder = {
  id: string;
  folio: string;
  created_at: string;
  total: number;
  primary_image: string | null;
  item_summary: string;
};

type Stats = {
  favorite: FavoriteInfo | null;
  memberSince: string | null;
  recent: RecentOrder[];
};

export default function Yo() {
  const router = useRouter();
  const { cliente, clear, setCliente, items, ready } = useCarrito();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [cumpleOpen, setCumpleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validación estricta del cliente (Modelo B).
  // Detecta y limpia "clientes fantasma" que quedaron de logouts viejos
  // (objeto truthy pero sin name/whatsapp/id válidos).
  // Usamos `!!cliente` primero para que TS narrows el resto del chain.
  const clienteValido =
    !!cliente &&
    !!cliente.id &&
    !!cliente.name?.trim() &&
    !!cliente.whatsapp &&
    cliente.whatsapp.length === 10;

  const currentAvatar = cliente?.avatar_pose;
  const cumpleHoy = isBirthdayToday(cliente?.birthday);

  // Bloquea el scroll del body cuando hay modal abierto. Sin esto, en mobile
  // tocar el overlay scrollea la página de atrás (bug que rebotaba la UI).
  useEffect(() => {
    const anyOpen = pickerOpen || cumpleOpen || showTour;
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pickerOpen, cumpleOpen, showTour]);

  const verTourDeNuevo = () => {
    resetTour(CLIENTE_TOUR_ID);
    setShowTour(true);
  };

  // Si hay cliente fantasma (logout viejo), límpialo automáticamente
  useEffect(() => {
    if (cliente && !clienteValido) {
      setCliente(null);
    }
  }, [cliente, clienteValido, setCliente]);

  useEffect(() => {
    // Si no hay cliente válido, mostramos empty state en lugar de cargar stats.
    // Combinamos !cliente con !clienteValido para que TS narrows el tipo
    // de `cliente` a no-null dentro del async siguiente.
    if (!cliente || !clienteValido) {
      setLoading(false);
      return;
    }
    (async () => {
      const supabase = createClient();

      const { data: orders } = await supabase
        .from("orders")
        .select("id, folio, created_at, total")
        .eq("customer_id", cliente.id)
        .neq("status", "declined")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      let favorite: FavoriteInfo | null = null;
      let memberSince: string | null = null;
      let recent: RecentOrder[] = [];

      if (orders && orders.length > 0) {
        const orderIds = orders.map((o: { id: string }) => o.id);

        const { data: orderItems } = await supabase
          .from("order_items")
          .select("order_id, product_id, product_name, quantity")
          .in("order_id", orderIds);

        // Conteo para favorito
        const counts: Record<string, { count: number; productId: string }> = {};
        for (const it of orderItems ?? []) {
          const nombre = (it.product_name as string).split(" [")[0];
          if (!counts[nombre]) {
            counts[nombre] = { count: 0, productId: it.product_id };
          }
          counts[nombre].count += it.quantity ?? 0;
        }
        const sorted = Object.entries(counts).sort(
          (a, b) => b[1].count - a[1].count
        );
        if (sorted.length > 0) {
          const [name, info] = sorted[0];
          // Buscar imagen del producto favorito
          const { data: prod } = await supabase
            .from("products")
            .select("image_url")
            .eq("id", info.productId)
            .maybeSingle();
          favorite = {
            name,
            image_url: prod?.image_url ?? null,
            count: info.count,
          };
        }

        // Miembro desde (primer pedido = ordenes están desc, último es el primero)
        const firstOrder = orders[orders.length - 1];
        if (firstOrder?.created_at) {
          memberSince = new Date(firstOrder.created_at).toLocaleDateString(
            "es-MX",
            { month: "long", year: "numeric" }
          );
        }

        // Últimos 3 pedidos con foto + resumen
        const productIds = Array.from(
          new Set(
            (orderItems ?? [])
              .map((it: any) => it.product_id)
              .filter(Boolean)
          )
        );
        const { data: prods } = productIds.length
          ? await supabase
              .from("products")
              .select("id, image_url")
              .in("id", productIds)
          : { data: [] as any[] };
        const productImage = new Map<string, string | null>();
        for (const p of (prods ?? []) as any[]) {
          productImage.set(p.id, p.image_url ?? null);
        }

        recent = orders.slice(0, 3).map((o: any) => {
          const itemsForOrder = (orderItems ?? []).filter(
            (it: any) => it.order_id === o.id
          );
          const firstItem = itemsForOrder[0];
          const primary_image = firstItem
            ? productImage.get(firstItem.product_id) ?? null
            : null;
          const item_summary = itemsForOrder
            .map(
              (it: any) =>
                `${it.quantity}× ${(it.product_name as string).split(" [")[0]}`
            )
            .join(", ");
          return {
            id: o.id,
            folio: o.folio,
            created_at: o.created_at,
            total: Number(o.total),
            primary_image,
            item_summary,
          };
        });
      }

      setStats({ favorite, memberSince, recent });
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
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
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
    // Importante: null limpia el contexto bien.
    // Antes pasábamos {name:"", whatsapp:""} y eso dejaba un cliente
    // "fantasma" que rompía la validación del carrito (orphan orders).
    setCliente(null);
    router.replace("/");
  };

  // Esperar a que CarritoProvider termine de leer localStorage para no
  // mostrar un flash del registro cuando el cliente sí está logueado.
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-canela text-sm">
        Cargando…
      </div>
    );
  }

  // Empty state cuando no hay cliente válido (Modelo B).
  // En lugar de redirigir al inicio, ofrecemos el registro AQUÍ mismo
  // (menos clics, menos rebote). El componente vive abajo.
  if (!cliente || !clienteValido) {
    return <YoRegistroEmptyState />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-28 bg-crema">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur px-4 py-3 border-b border-caramelo/20">
        <h1
          className="text-2xl text-cafe text-center"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Yo
        </h1>
      </header>

      <div className="flex-1 px-4 pt-5 flex flex-col gap-3">
        {/* Bloque avatar + identidad */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Avatar circular grande. La FOTO ENTERA es tapeable para
              abrir el picker (más intuitivo que el + chiquito), pero
              también dejamos el + visible como pista visual de que es
              editable. */}
          <button
            onClick={() => setPickerOpen(true)}
            aria-label="Cambiar avatar"
            className="relative w-44 h-44 sm:w-52 sm:h-52 active:scale-[0.97] transition"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-crema-soft shadow-md ring-2 ring-white">
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
            <span className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-antojo text-white flex items-center justify-center shadow-lg ring-2 ring-white pointer-events-none">
              <IconPlus size={18} stroke={3} />
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

          {/* Chip cumpleaños */}
          <button
            onClick={() => setCumpleOpen(true)}
            className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition ${
              cliente.birthday
                ? cumpleHoy
                  ? "bg-antojo text-white shadow-md"
                  : "bg-white text-cafe border border-caramelo/40"
                : "bg-white text-canela border border-dashed border-caramelo"
            }`}
            style={{ fontFamily: "Termina" }}
          >
            <IconCake size={13} />
            {cliente.birthday
              ? cumpleHoy
                ? "¡Hoy es tu día!"
                : formatBirthday(cliente.birthday)
              : "Agregar mi cumple"}
          </button>
        </div>

        {/* Si es cumple hoy: banner especial */}
        {cumpleHoy && (
          <div className="bg-gradient-to-br from-antojo to-[#E04A18] text-white rounded-2xl p-4 shadow-lg fade-up">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎂</div>
              <div className="flex-1">
                <div
                  className="text-xl leading-none"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  ¡Feliz cumple, {cliente.name}!
                </div>
                <p className="text-[11px] opacity-95 mt-1 leading-relaxed">
                  Hoy un rol va por la casa. Cuando armes tu antojo se
                  descuenta solito.
                </p>
              </div>
            </div>
            <Link
              href="/catalogo"
              className="mt-3 bg-white text-antojo rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
            >
              Pedir mi rol de cumple <IconChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Card Miembro desde */}
        {!loading && stats?.memberSince && (
          <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-full bg-crema-soft flex items-center justify-center text-lg">
              🤎
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
                Miembro desde
              </div>
              <div
                className="text-sm font-bold text-cafe capitalize"
                style={{ fontFamily: "Termina" }}
              >
                {stats.memberSince}
              </div>
            </div>
          </div>
        )}

        {/* Card Favorito */}
        {!loading && stats?.favorite && (
          <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 fade-up">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-crema-soft flex-shrink-0 flex items-center justify-center">
              {stats.favorite.image_url ? (
                <Image
                  src={stats.favorite.image_url}
                  alt={stats.favorite.name}
                  width={120}
                  height={120}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🥐</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
                Tu favorito
              </div>
              <div
                className="text-sm font-bold text-cafe truncate"
                style={{ fontFamily: "Termina" }}
              >
                {stats.favorite.name}
              </div>
              <div className="text-[11px] text-caramelo italic">
                Lo has pedido {stats.favorite.count}{" "}
                {stats.favorite.count === 1 ? "vez" : "veces"}
              </div>
            </div>
          </div>
        )}

        {/* Card Últimos pedidos */}
        {!loading && stats && stats.recent.length > 0 && (
          <Link
            href="/mis-pedidos"
            className="bg-white rounded-2xl p-3 shadow-sm fade-up active:scale-[0.98] transition block"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
                Tus últimos antojos
              </div>
              <span className="text-[11px] text-antojo font-bold flex items-center gap-0.5">
                Ver todos <IconChevronRight size={11} />
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {stats.recent.map((o) => (
                <div
                  key={o.id}
                  className="flex-1 bg-crema-soft rounded-xl overflow-hidden"
                >
                  <div className="aspect-square bg-white flex items-center justify-center">
                    {o.primary_image ? (
                      <Image
                        src={o.primary_image}
                        alt={o.folio}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🥐</span>
                    )}
                  </div>
                  <div className="px-1.5 py-1 text-center">
                    <div className="text-[11px] text-canela truncate">
                      {new Date(o.created_at).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div
                      className="text-[11px] font-bold text-antojo leading-none"
                      style={{ fontFamily: "Termina" }}
                    >
                      ${o.total.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
              {/* Slot vacío con Miga si hay menos de 3 */}
              {stats.recent.length < 3 &&
                Array.from({ length: 3 - stats.recent.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex-1 bg-crema-soft/40 rounded-xl border-2 border-dashed border-caramelo/30 flex items-center justify-center aspect-square"
                  >
                    <IconPlus size={20} className="text-caramelo/50" />
                  </div>
                ))}
            </div>
          </Link>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white/60 rounded-2xl p-8 text-center text-canela text-sm">
            Calculando tu antojo…
          </div>
        )}

        {/* Sin pedidos: CTA Antójame */}
        {!loading && stats && stats.recent.length === 0 && (
          <div className="bg-white rounded-2xl p-5 text-center fade-up">
            <p className="text-xs text-canela italic mb-3">
              Tu antojo apenas empieza. ¿Estrenamos?
            </p>
            <Link
              href="/antojame"
              className="inline-flex items-center gap-2 bg-antojo text-white rounded-2xl px-4 py-2.5 text-xs font-bold active:scale-95 transition shadow-md"
            >
              <IconSparkles size={14} /> ¡Antójame!
            </Link>
          </div>
        )}

        <div className="flex-1" />

        {/* Acciones secundarias */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={verTourDeNuevo}
            className="text-xs text-cafe bg-white border border-caramelo/40 rounded-full px-4 py-2 flex items-center gap-1.5 active:scale-95 transition shadow-sm"
          >
            <IconSparkles size={13} className="text-antojo" />
            Ver tutorial otra vez
          </button>
          <button
            onClick={cambiarPersona}
            className="text-xs text-canela underline flex items-center gap-1 active:scale-95"
          >
            <IconLogout size={13} />
            ¿No eres tú? Cambiar de persona
          </button>
        </div>
      </div>

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
                <div className="text-[11px] text-canela">
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

            <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
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

      {/* Modal cumpleaños */}
      <CumpleModal open={cumpleOpen} onClose={() => setCumpleOpen(false)} />

      {/* Tour bajo demanda */}
      {showTour && (
        <ClienteOnboarding
          forceShow
          onClose={() => setShowTour(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
