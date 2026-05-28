"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconHeart,
  IconShoppingBag,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Mapea producto a su imagen de recomendación
function recomendacionVariant(url: string | null): string | null {
  if (!url) return null;
  return url
    .replace("/productos/full-color/", "/recomendaciones/")
    .replace("/productos/png/", "/recomendaciones/");
}

export default function DetalleProductoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-canela text-sm">Cargando…</div>}>
      <DetalleProducto />
    </Suspense>
  );
}

function DetalleProducto() {
  const router = useRouter();
  const params = useSearchParams();
  const { add } = useCarrito();
  const productId = params.get("id");

  const [product, setProduct] = useState<Product | null>(null);
  const [sugerencias, setSugerencias] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!productId) {
      router.replace("/catalogo");
      return;
    }
    const supabase = createClient();
    Promise.all([
      supabase.from("products").select("*").eq("id", productId).single(),
      supabase
        .from("products")
        .select("*")
        .eq("is_public", true)
        .eq("is_active", true)
        .neq("id", productId),
    ]).then(([{ data: prod }, { data: sug }]) => {
      setProduct(prod);
      // Sugerencias variadas: priorizar categorías distintas + random
      const pool = (sug ?? []) as Product[];
      const sameCat = pool.filter((p) => p.category === prod?.category);
      const otherCat = pool.filter((p) => p.category !== prod?.category);
      const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
      // 1 misma categoría (variedad sabores) + 1 otra categoría
      const pick = [
        ...shuffle(sameCat).slice(0, 1),
        ...shuffle(otherCat).slice(0, 1),
      ].filter(Boolean);
      // Fallback si solo hay misma cat
      if (pick.length < 2) {
        const extras = shuffle(pool).filter(
          (p) => !pick.find((x) => x.id === p.id)
        );
        while (pick.length < 2 && extras.length > 0) {
          pick.push(extras.shift()!);
        }
      }
      setSugerencias(pick);
      setLoading(false);
    });
  }, [productId, router]);

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-canela text-sm">
        Cargando…
      </div>
    );
  }

  const descripcion =
    product.description ||
    "Antojo en su versión más honesta. Pide y te cuento más.";

  const onAdd = () => {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--avellana-soft)] pb-32">
      {/* Imagen */}
      <div className="relative">
        <button
          onClick={() => router.back()}
          aria-label="Atrás"
          className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center text-cafe active:scale-90 transition"
        >
          <IconArrowLeft size={18} />
        </button>
        <button
          aria-label="Favorito"
          className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center text-cafe active:scale-90 transition"
        >
          <IconHeart size={18} />
        </button>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={600}
            height={600}
            className="w-full aspect-square object-cover"
            priority
          />
        ) : (
          <div className="w-full aspect-square bg-crema-soft flex items-center justify-center text-6xl">
            🥐
          </div>
        )}
      </div>

      {/* Detalle */}
      <div className="flex-1 px-5 pt-5 pb-32 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h1
            className="text-2xl text-cafe"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {product.name}
          </h1>
          <div
            className="text-2xl text-[#F25C20] whitespace-nowrap"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {product.price_is_starting && (
              <span className="text-xs text-canela font-normal mr-1">desde</span>
            )}
            ${Number(product.price).toFixed(0)}
          </div>
        </div>

        <p className="text-xs text-cafe mt-3 leading-relaxed">{descripcion}</p>

        {sugerencias.length > 0 && (
          <>
            <div className="text-[11px] font-bold text-canela mt-6 mb-2 uppercase tracking-wider">
              ¿Ya lo probaste?
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sugerencias.map((s) => {
                const recoUrl = recomendacionVariant(s.image_url);
                const isBox = s.category === "rollinbox" || s.category === "luvinbox";
                const href = isBox
                  ? `/box/${slugify(s.name)}?id=${s.id}`
                  : `/producto/${slugify(s.name)}?id=${s.id}`;
                return (
                  <Link
                    key={s.id}
                    href={href}
                    className="block active:scale-95 transition"
                  >
                    {recoUrl && (
                      <Image
                        src={recoUrl}
                        alt={s.name}
                        width={300}
                        height={400}
                        className="w-full h-auto rounded-2xl shadow-md"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Botón sticky agregar (encima del bottom nav) */}
      <div className="fixed bottom-[68px] left-0 right-0 max-w-md mx-auto p-3 bg-gradient-to-t from-[var(--avellana-soft)] via-[var(--avellana-soft)] to-transparent">
        <button
          onClick={onAdd}
          className="w-full bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
        >
          {added ? (
            <>¡Agregado! ✓</>
          ) : (
            <>
              Agregar al pedido <IconShoppingBag size={16} />
            </>
          )}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
