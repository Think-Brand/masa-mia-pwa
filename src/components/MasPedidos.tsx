"use client";

import Image from "next/image";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { Product } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import { useToast } from "@/components/Toast";
import { productHref, isBox } from "@/lib/productLink";
import { flyToCart } from "@/lib/flyToCart";

/**
 * Carrusel "Los más pedidos" (Feature 2).
 *
 * Fila horizontal con scroll-snap, debajo del Hero. Comparte el cálculo de
 * best-sellers con el Antojo del día (mismo fetch). Cards chicas con badge de
 * ranking. Mantiene la estética de las cards del grid (blanco, rounded-xl,
 * sombra suave).
 */
export default function MasPedidos({ products }: { products: Product[] }) {
  const { add } = useCarrito();
  const { show: showToast } = useToast();

  if (products.length === 0) return null;

  const handleAdd = (
    e: React.MouseEvent<HTMLButtonElement>,
    p: Product,
    isFirst: boolean
  ) => {
    add(p);
    flyToCart(e.currentTarget, p.image_url);
    if (isFirst) {
      showToast({
        title: `${p.name} agregado`,
        subtitle: "De los más pedidos, buena elección 🤎",
        imageUrl: p.image_url,
      });
    }
  };

  return (
    <section className="mt-1 mb-1">
      <div className="flex items-center gap-1.5 px-3 mb-2">
        <span className="text-base">🔥</span>
        <h2
          className="text-sm font-bold text-cafe uppercase tracking-wide"
          style={{ fontFamily: "Termina" }}
        >
          Los más pedidos
        </h2>
      </div>

      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar px-3 pb-1">
        {products.map((p, i) => {
          const box = isBox(p);
          return (
            <article
              key={p.id}
              data-fly-card
              className="snap-start flex-shrink-0 w-[150px] bg-white rounded-xl overflow-hidden shadow-sm flex flex-col"
            >
              <Link href={productHref(p)} className="relative block">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    width={300}
                    height={300}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-crema-soft flex items-center justify-center text-3xl text-cafe/30">
                    🥐
                  </div>
                )}
                {/* Badge de ranking */}
                <span
                  className="absolute top-1.5 left-1.5 bg-antojo text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow tabular-nums"
                  style={{ fontFamily: "Termina" }}
                  aria-label={`Número ${i + 1} más pedido`}
                >
                  {i + 1}
                </span>
              </Link>

              <div className="px-2.5 py-2 flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[11px] font-bold text-cafe truncate"
                    style={{ fontFamily: "Termina" }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="text-xs font-bold text-antojo tabular-nums"
                    style={{ fontFamily: "Termina" }}
                  >
                    {p.price_is_starting && (
                      <span className="text-[11px] text-canela font-medium mr-0.5">
                        desde
                      </span>
                    )}
                    ${Number(p.price).toFixed(0)}
                  </div>
                </div>

                {box ? (
                  <Link
                    href={productHref(p)}
                    aria-label={`Armar ${p.name}`}
                    className="btn-masa btn-masa-plus"
                  >
                    <IconPlus size={18} stroke={2.5} />
                  </Link>
                ) : (
                  <button
                    onClick={(e) => handleAdd(e, p, true)}
                    aria-label={`Agregar ${p.name}`}
                    className="btn-masa btn-masa-plus"
                  >
                    <IconPlus size={18} stroke={2.5} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
