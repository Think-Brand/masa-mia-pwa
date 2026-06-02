"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
// Nota: ya no usamos useRouter aquí porque Modelo B no redirige al
// catálogo cuando falta cliente.
import { IconPlus, IconMinus, IconCheck, IconSparkles } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Product, Category } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import { useToast } from "@/components/Toast";
import HeaderCliente from "@/components/HeaderCliente";
import BottomNav from "@/components/BottomNav";
import ClienteOnboarding from "@/components/ClienteOnboarding";

type Tab = "todo" | Category;

const TABS: { key: Tab; label: string }[] = [
  { key: "todo", label: "Todo el antojo" },
  { key: "rol", label: "Roles" },
  { key: "rollinbox", label: "RollinBox" },
  { key: "berlinesa", label: "Berlinesas" },
  { key: "luvinbox", label: "LuvinBox" },
];

// Orden de prioridad cuando se muestra "Todo el antojo"
const CATEGORY_ORDER: Record<string, number> = {
  rol: 1,
  rollinbox: 2,
  berlinesa: 3,
  luvinbox: 4,
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function Catalogo() {
  const { add, getProductQty, decreaseOne } = useCarrito();
  const { show: showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleAdd = (p: Product, isFirst: boolean) => {
    add(p);
    setJustAdded(p.id);
    // Toast solo en el primer agregado del producto (no en cada incremento)
    if (isFirst) {
      showToast({
        title: `${p.name} agregado`,
        subtitle: "Súmale más o pasa al carrito 🤎",
        imageUrl: p.image_url,
      });
    }
    window.setTimeout(() => {
      setJustAdded((curr) => (curr === p.id ? null : curr));
    }, 600);
  };

  const handleDecrease = (p: Product) => {
    decreaseOne(p.id);
  };

  // Modelo B: el catálogo se navega libre, sin gate.
  // Si no hay cliente, NO redirigimos — los datos se piden al pagar.

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("*")
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "todo") {
      // En "Todo el antojo" respetar orden: rol → rollinbox → berlinesa → luvinbox
      return [...products].sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.category] ?? 99;
        const orderB = CATEGORY_ORDER[b.category] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
    }
    return products.filter((p) => p.category === activeTab);
  }, [products, activeTab]);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24">
      <HeaderCliente />

      {/* Banner Antójame con Miga recomendando cortada (overflow) */}
      <Link
        href="/antojame"
        className="relative mx-3 mt-3 mb-1 bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition shadow-md overflow-hidden"
      >
        <div className="relative w-20 h-20 flex-shrink-0 -my-3 -ml-2">
          <Image
            src="/mascota/recomendando.png"
            alt="Miga recomendando"
            fill
            sizes="80px"
            className="object-cover object-top drop-shadow-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-bold opacity-90 uppercase tracking-wider"
            style={{ fontFamily: "Termina" }}
          >
            No sé qué pedir…
          </div>
          <div
            className="text-2xl leading-none"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ¡Antójame!
          </div>
        </div>
        <div className="bg-white/20 rounded-full p-2">
          <IconSparkles size={18} />
        </div>
      </Link>

      {/* Tabs de categorías */}
      <nav className="px-3 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              activeTab === t.key
                ? "bg-antojo text-white shadow-md"
                : "bg-transparent text-cafe border border-canela"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Grid de productos — key={activeTab} dispara tab-fade al cambiar filtro */}
      <div
        key={activeTab}
        className="flex-1 px-3 pt-2 grid grid-cols-2 gap-2.5 content-start tab-fade"
      >
        {loading &&
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/70 rounded-xl aspect-square animate-pulse"
            />
          ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-2 text-center py-10 text-canela text-sm">
            <p>Nada por aquí todavía 👀</p>
            <p className="text-xs mt-1 text-caramelo">
              Miga dice: "vuelve pronto, sabe que se viene algo rico"
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((p) => {
            const isBox = p.category === "rollinbox" || p.category === "luvinbox";
            const detalleHref = isBox
              ? `/box/${slugify(p.name)}?id=${p.id}`
              : `/producto/${slugify(p.name)}?id=${p.id}`;
            return (
              <article
                key={p.id}
                className="bg-white rounded-xl overflow-hidden flex flex-col shadow-sm"
              >
                <Link href={detalleHref} className="relative block">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={400}
                      height={400}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-crema-soft flex items-center justify-center text-cafe/30 text-3xl">
                      🥐
                    </div>
                  )}
                  {p.is_limited && (
                    <span className="absolute top-1.5 left-1.5 bg-antojo text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      ✨ Edición limitada
                    </span>
                  )}
                </Link>
                <div className="px-2.5 py-2 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] font-bold text-cafe truncate"
                      style={{ fontFamily: "Termina" }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="text-xs font-bold text-[#F25C20]"
                      style={{ fontFamily: "Termina" }}
                    >
                      {p.price_is_starting && (
                        <span className="text-[11px] text-canela font-medium mr-0.5">desde</span>
                      )}
                      ${Number(p.price).toFixed(0)}
                    </div>
                  </div>
                  {isBox ? (
                    <Link
                      href={detalleHref}
                      aria-label={`Armar ${p.name}`}
                      className="w-10 h-10 rounded-full bg-antojo text-white flex items-center justify-center shadow-md active:scale-90 transition flex-shrink-0"
                    >
                      <IconPlus size={20} stroke={2.5} />
                    </Link>
                  ) : (
                    <ProductStepper
                      qty={getProductQty(p.id)}
                      pulse={justAdded === p.id}
                      onAdd={() =>
                        handleAdd(p, getProductQty(p.id) === 0)
                      }
                      onMinus={() => handleDecrease(p)}
                      productName={p.name}
                    />
                  )}
                </div>
              </article>
            );
          })}
      </div>

      <BottomNav />

      {/* Tour de Miga al primer ingreso (solo si pilot_mode = on) */}
      <ClienteOnboarding />
    </div>
  );
}

// ──────────────────────────────────────────────
// ProductStepper — botón "+" que se transforma en stepper [− N +]
// ──────────────────────────────────────────────
function ProductStepper({
  qty,
  pulse,
  onAdd,
  onMinus,
  productName,
}: {
  qty: number;
  pulse: boolean;
  onAdd: () => void;
  onMinus: () => void;
  productName: string;
}) {
  // Estado vacío: solo botón +
  if (qty === 0) {
    return (
      <button
        onClick={onAdd}
        aria-label={`Agregar ${productName}`}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0 ${
          pulse
            ? "bg-verde text-white scale-110"
            : "bg-antojo text-white active:scale-90"
        }`}
      >
        {pulse ? (
          <IconCheck size={22} stroke={3} />
        ) : (
          <IconPlus size={20} stroke={2.5} />
        )}
      </button>
    );
  }

  // Con cantidad: stepper completo (en verde para indicar "ya en carrito")
  return (
    <div
      className={`flex items-center bg-verde text-white rounded-full shadow-md overflow-hidden transition-all flex-shrink-0 ${
        pulse ? "ring-2 ring-white/60 scale-105" : ""
      }`}
      style={{ height: 40 }}
    >
      <button
        onClick={onMinus}
        aria-label={`Quitar uno de ${productName}`}
        className="w-9 h-10 flex items-center justify-center active:scale-90 transition hover:bg-black/10"
      >
        <IconMinus size={16} stroke={2.8} />
      </button>
      <span
        key={qty}
        className="px-1 min-w-[18px] text-center text-sm font-bold qty-bump"
        style={{ fontFamily: "Termina" }}
      >
        {qty}
      </span>
      <button
        onClick={onAdd}
        aria-label={`Agregar otro ${productName}`}
        className="w-9 h-10 flex items-center justify-center active:scale-90 transition hover:bg-black/10"
      >
        <IconPlus size={16} stroke={2.8} />
      </button>

      <style jsx>{`
        @keyframes qtyBump {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.22);
            color: #fff5e0;
          }
          100% {
            transform: scale(1);
          }
        }
        .qty-bump {
          display: inline-block;
          animation: qtyBump 0.36s cubic-bezier(0.22, 1.2, 0.36, 1);
        }
      `}</style>
    </div>
  );
}
