"use client";

import Image from "next/image";
import Link from "next/link";
import { useCarrito } from "./CarritoProvider";
import { IconMenu2, IconShoppingBag } from "@tabler/icons-react";

export default function HeaderCliente() {
  const { count } = useCarrito();

  return (
    <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur border-b border-caramelo/20">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <button
          aria-label="Menú"
          className="text-cafe p-1 active:scale-95 transition"
        >
          <IconMenu2 size={22} />
        </button>

        <Link href="/catalogo" className="flex items-center">
          <Image
            src="/logos/logo-05.png"
            alt="Masa Mía"
            width={140}
            height={42}
            priority
            style={{ height: 38, width: "auto" }}
          />
        </Link>

        <Link
          href="/carrito"
          aria-label="Mi antojo"
          className="relative text-cafe p-1 active:scale-95 transition"
        >
          <IconShoppingBag size={22} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#F25C20] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
