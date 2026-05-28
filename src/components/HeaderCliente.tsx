"use client";

import Image from "next/image";
import Link from "next/link";
import { useCarrito } from "./CarritoProvider";
import { IconShoppingBag } from "@tabler/icons-react";

export default function HeaderCliente() {
  const { count } = useCarrito();

  return (
    <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur border-b border-caramelo/20">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        {/* Espaciador izquierdo (mismo ancho que el carrito para centrar logo) */}
        <div className="w-10" />

        <Link href="/catalogo" className="flex items-center">
          <Image
            src="/logos/logo-06.png"
            alt="Masa Mía"
            width={360}
            height={108}
            priority
            style={{ height: 100, width: "auto" }}
          />
        </Link>

        <Link
          href="/carrito"
          aria-label="Mi antojo"
          className="relative text-cafe p-1 active:scale-95 transition w-10 flex items-center justify-center"
        >
          <IconShoppingBag size={30} />
          {count > 0 && (
            <span className="absolute top-0 -right-0.5 bg-antojo text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
