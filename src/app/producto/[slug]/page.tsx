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

// Microcopy en voz de Miga por producto (comensal noble, no chef)
const DESCRIPCIONES: Record<string, string> = {
  Lotusho:
    "**Lo mío, lo nuestro**. Galleta caramelizada, cremita y un crunch. Compartir suena bien, comprar 2 mejor.",
  Mangoco:
    "Mucho **mango y coco rayado**. Tropical, coqueto, antojo garantizado. Para el calor o para el pretexto.",
  Pistachito:
    "**Pistache** que no es de adorno. Cremoso, herbal, elegante sin presumir.",
  Frutella:
    "**Fresa con Nutella**, sin medias tintas. Dulce, atrevido, para los que no se andan con vueltas.",
  Original:
    "**El de siempre**. Masa madre, canela, glaseado clásico. Como abrir el horno y sonreír.",
  RollSnicker:
    "**Cacahuate y chocolate** en cada bocado. Crujiente, dulce, te pide otro.",
  "Mil Besos":
    "**Cubierto de kisses**. Para los que aman el chocolate sin pretextos.",
  Nubechoco:
    "**Crema Nube** con chispas de chocolate. Suave, ligero, perfecto con café.",
  Nutella: "Berlinesa con **Nutella** adentro. Mordida + sorpresa = felicidad.",
  Clásica:
    "Berlinesa **clásica con azúcar**. Tradicional, esponjosa, sin pedir permiso.",
  "RollinBox 4": "Caja con **4 roles** variados. Para compartir o atascarse.",
  "LuvinBox 12":
    "**12 roles** mixtos. Regalo serio. Detalle de los buenos.",
};

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
    DESCRIPCIONES[product.name] ||
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
            className="text-2xl text-[#F25C20]"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ${Number(product.price).toFixed(0)}
          </div>
        </div>

        <p
          className="text-xs text-cafe mt-3 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: descripcion.replace(
              /\*\*(.+?)\*\*/g,
              "<b>$1</b>"
            ),
          }}
        />

        {sugerencias.length > 0 && (
          <>
            <div className="text-[11px] font-bold text-canela mt-6 mb-2 uppercase tracking-wider">
              ¿Ya lo probaste?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sugerencias.map((s) => (
                <Link
                  key={s.id}
                  href={`/producto/${slugify(s.name)}?id=${s.id}`}
                  className="bg-white rounded-xl p-2 text-center active:scale-95 transition"
                >
                  {s.image_url && (
                    <Image
                      src={s.image_url}
                      alt={s.name}
                      width={120}
                      height={120}
                      className="w-14 h-14 object-cover rounded-lg mx-auto"
                    />
                  )}
                  <div
                    className="text-[11px] font-bold text-cafe mt-1.5"
                    style={{ fontFamily: "Termina" }}
                  >
                    {s.name}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Botón sticky agregar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-gradient-to-t from-[var(--avellana-soft)] via-[var(--avellana-soft)] to-transparent">
        <button
          onClick={onAdd}
          className="w-full bg-cafe text-crema rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
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
