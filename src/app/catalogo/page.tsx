"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconCheck, IconSparkles } from "@tabler/icons-react";
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
  const router = useRouter();
  const { cliente, add } = useCarrito();
  const { show: showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("todo");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleAdd = (p: Product) => {
    add(p);
    setJustAdded(p.id);
    showToast({
      title: `${p.name} agregado`,
      subtitle: "Sigue antojándote o pasa al carrito 🤎",
      imageUrl: p.image_url,
    });
    window.setTimeout(() => {
      setJustAdded((curr) => (curr === p.id ? null : curr));
    }, 900);
  };

  // Si no hay cliente, regresa al lead gate
  useEffect(() => {
    if (!cliente) router.replace("/");
  }, [cliente, router]);

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

  if (!cliente) return null;

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
            className="text-[10px] font-bold opacity-90 uppercase tracking-wider"
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

      {/* Grid de productos */}
      <div className="flex-1 px-3 pt-2 grid grid-cols-2 gap-2.5 content-start">
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
                className="bg-white rounded-xl overflow-hidden flex flex-col fade-up shadow-sm"
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
                    <span className="absolute top-1.5 left-1.5 bg-antojo text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
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
                        <span className="text-[9px] text-canela font-medium mr-0.5">desde</span>
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
                    <button
                      onClick={() => handleAdd(p)}
                      aria-label={`Agregar ${p.name}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0 ${
                        justAdded === p.id
                          ? "bg-verde text-white scale-110"
                          : "bg-antojo text-white active:scale-90"
                      }`}
                    >
                      {justAdded === p.id ? (
                        <IconCheck size={22} stroke={3} />
                      ) : (
                        <IconPlus size={20} stroke={2.5} />
                      )}
                    </button>
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
