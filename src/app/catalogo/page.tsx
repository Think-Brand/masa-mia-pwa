"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconArrowRight } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Product, Category } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import HeaderCliente from "@/components/HeaderCliente";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "rol", label: "Roles" },
  { key: "berlinesa", label: "Berlinesas" },
  { key: "rollinbox", label: "RollinBox" },
  { key: "luvinbox", label: "LuvinBox" },
];

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
  const { cliente, add, count, total } = useCarrito();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<Category>("rol");

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

  const filtered = useMemo(
    () => products.filter((p) => p.category === activeCat),
    [products, activeCat]
  );

  if (!cliente) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24">
      <HeaderCliente />

      {/* Tabs de categorías */}
      <nav className="px-3 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCat(c.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              activeCat === c.key
                ? "bg-cafe text-crema"
                : "bg-transparent text-cafe border border-canela"
            }`}
          >
            {c.label}
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
          filtered.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-xl overflow-hidden flex flex-col fade-up shadow-sm"
            >
              <Link
                href={`/producto/${slugify(p.name)}?id=${p.id}`}
                className="relative block"
              >
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
                    ${Number(p.price).toFixed(0)}
                  </div>
                </div>
                <button
                  onClick={() => add(p)}
                  aria-label={`Agregar ${p.name}`}
                  className="w-7 h-7 rounded-full bg-cafe text-crema flex items-center justify-center shadow active:scale-90 transition"
                >
                  <IconPlus size={14} />
                </button>
              </div>
            </article>
          ))}
      </div>

      {/* Footer carrito sticky */}
      {count > 0 && (
        <Link
          href="/carrito"
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-cafe text-crema px-4 py-3 flex items-center justify-between fade-up"
          style={{ fontFamily: "Termina" }}
        >
          <div>
            <div className="text-[10px] opacity-80">
              {count} {count === 1 ? "pieza" : "piezas"}
            </div>
            <div className="text-base font-bold">${total.toFixed(0)}</div>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold">
            Ver mi antojo <IconArrowRight size={16} />
          </div>
        </Link>
      )}
    </div>
  );
}
