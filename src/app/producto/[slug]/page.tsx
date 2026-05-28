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

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Convierte una ruta de full-color a PNG transparente equivalente
function transparentVariant(url: string | null): string | null {
  if (!url) return null;
  return url.replace("/full-color/", "/png/");
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
        .neq("id", productId)
        .order("sort_order")
        .limit(2),
    ]).then(([{ data: prod }, { data: sug }]) => {
      setProduct(prod);
      setSugerencias(sug ?? []);
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
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--avellana-soft)]">
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
                const pngUrl = transparentVariant(s.image_url);
                return (
                  <Link
                    key={s.id}
                    href={`/producto/${slugify(s.name)}?id=${s.id}`}
                    className="relative bg-gradient-to-br from-canela to-cafe rounded-2xl p-3 active:scale-95 transition overflow-hidden shadow-md"
                  >
                    {pngUrl && (
                      <Image
                        src={pngUrl}
                        alt={s.name}
                        width={200}
                        height={200}
                        className="w-full aspect-square object-contain drop-shadow-md"
                      />
                    )}
                    <div
                      className="text-xs font-bold text-crema mt-1 text-center"
                      style={{ fontFamily: "Termina" }}
                    >
                      {s.name}
                    </div>
                    <div className="text-[10px] text-caramelo text-center font-medium">
                      ${Number(s.price).toFixed(0)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Botón sticky agregar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gradient-to-t from-[var(--avellana-soft)] via-[var(--avellana-soft)] to-transparent">
        <button
          onClick={onAdd}
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
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
    </div>
  );
}
