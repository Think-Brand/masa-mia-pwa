"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IconSparkles, IconPlus, IconCheck } from "@tabler/icons-react";
import { Product } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import { useToast } from "@/components/Toast";
import { productHref, isBox } from "@/lib/productLink";
import { flyToCart } from "@/lib/flyToCart";

/**
 * Hero "Antojo del día" (Feature 1).
 *
 * Destacado grande arriba del catálogo. Foto a buen tamaño con glassmorphism
 * cálido y un aura que respira detrás. El producto lo decide el servidor
 * (best-sellers, rotación diaria por zona MX). CTA = botón clay del sistema.
 */
export default function AntojoDelDia({ product }: { product: Product }) {
  const { add } = useCarrito();
  const { show: showToast } = useToast();
  const [added, setAdded] = useState(false);
  const box = isBox(product);

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    add(product);
    flyToCart(e.currentTarget, product.image_url);
    setAdded(true);
    showToast({
      title: `${product.name} agregado`,
      subtitle: "El antojo del día, directo al carrito 🤎",
      imageUrl: product.image_url,
    });
    window.setTimeout(() => setAdded(false), 1000);
  };

  return (
    <section className="relative mx-3 mt-3 mb-2" data-fly-card>
      {/* Aura cálida que respira por detrás de la foto */}
      <div
        className="antojo-aura absolute -inset-2 -z-10"
        aria-hidden="true"
      />

      <div className="relative rounded-3xl overflow-hidden shadow-[0_14px_30px_rgba(58,39,29,0.18)]">
        {/* Foto */}
        <Link
          href={productHref(product)}
          aria-label={`Ver ${product.name}`}
          className="block relative aspect-[16/11] bg-crema-soft"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-cafe/30">
              🥐
            </div>
          )}

          {/* Badge Antojo del día */}
          <span
            className="absolute top-3 left-3 bg-antojo text-white text-[12px] font-bold pl-2 pr-2.5 py-1 rounded-full shadow-md flex items-center gap-1"
            style={{ fontFamily: "Termina" }}
          >
            <IconSparkles size={14} stroke={2.5} />
            Antojo del día
          </span>
        </Link>

        {/* Panel glass cálido sobre la base de la foto */}
        <div className="antojo-glass absolute inset-x-0 bottom-0 px-3.5 pt-3 pb-3.5 flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-lg text-cafe leading-tight truncate"
              style={{ fontFamily: "ReginaBlack" }}
            >
              {product.name}
            </div>
            <div
              className="text-base font-bold text-antojo tabular-nums"
              style={{ fontFamily: "Termina" }}
            >
              {product.price_is_starting && (
                <span className="text-[11px] text-canela font-medium mr-0.5">
                  desde
                </span>
              )}
              ${Number(product.price).toFixed(0)}
            </div>
          </div>

          {box ? (
            <Link
              href={productHref(product)}
              aria-label={`Armar ${product.name}`}
              className="btn-masa btn-masa-primary flex items-center gap-1.5 pl-4 pr-4 py-2.5 text-sm font-bold text-white flex-shrink-0"
              style={{ minHeight: 44 }}
            >
              <IconPlus size={18} stroke={2.6} />
              Armar
            </Link>
          ) : (
            <button
              onClick={handleAdd}
              aria-label={`Agregar ${product.name}`}
              className="btn-masa btn-masa-primary flex items-center gap-1.5 pl-4 pr-4 py-2.5 text-sm font-bold text-white flex-shrink-0"
              style={{ minHeight: 44 }}
            >
              {added ? (
                <IconCheck size={18} stroke={2.8} />
              ) : (
                <IconPlus size={18} stroke={2.6} />
              )}
              {added ? "Listo" : "Agregar"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
