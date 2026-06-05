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
 * Antojo del día (Feature 1) — versión COMPACTA.
 *
 * Va debajo del botón ¡Antójame! (que es el destacado principal). Card
 * horizontal de poca altura: foto pequeña con aura cálida detrás + glass con
 * nombre, precio y CTA. El producto lo decide el servidor (best-sellers,
 * rotación diaria por zona MX).
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
    <section
      className="antojo-glass relative mx-3 mt-1 mb-2 rounded-2xl p-2 flex items-center gap-3 overflow-hidden"
      data-fly-card
    >
      {/* Foto con aura cálida detrás */}
      <Link
        href={productHref(product)}
        aria-label={`Ver ${product.name}`}
        className="relative w-[72px] h-[72px] flex-shrink-0"
      >
        <div className="antojo-aura absolute -inset-2 -z-10" aria-hidden="true" />
        <div className="antojo-float relative w-full h-full rounded-xl overflow-hidden bg-crema-soft shadow-sm">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="72px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-cafe/30">
              🥐
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-antojo uppercase tracking-wide"
          style={{ fontFamily: "Termina" }}
        >
          <IconSparkles size={12} stroke={2.6} />
          Antojo del día
        </span>
        <div
          className="text-base text-cafe leading-tight truncate"
          style={{ fontFamily: "ReginaBlack" }}
        >
          {product.name}
        </div>
        <div
          className="text-sm font-bold text-antojo tabular-nums leading-none"
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

      {/* CTA */}
      {box ? (
        <Link
          href={productHref(product)}
          aria-label={`Armar ${product.name}`}
          className="btn-masa btn-masa-primary flex items-center gap-1 pl-3 pr-3.5 py-2 text-sm font-bold text-white flex-shrink-0"
          style={{ minHeight: 40 }}
        >
          <IconPlus size={16} stroke={2.6} />
          Armar
        </Link>
      ) : (
        <button
          onClick={handleAdd}
          aria-label={`Agregar ${product.name}`}
          className="btn-masa btn-masa-primary flex items-center gap-1 pl-3 pr-3.5 py-2 text-sm font-bold text-white flex-shrink-0"
          style={{ minHeight: 40 }}
        >
          {added ? (
            <IconCheck size={16} stroke={2.8} />
          ) : (
            <IconPlus size={16} stroke={2.6} />
          )}
          {added ? "Listo" : "Agregar"}
        </button>
      )}
    </section>
  );
}
