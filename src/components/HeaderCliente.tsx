"use client";

import Image from "next/image";
import Link from "next/link";
import { useCarrito } from "./CarritoProvider";
import NotificationBell from "./NotificationBell";
import { IconShoppingBag } from "@tabler/icons-react";

export default function HeaderCliente() {
  const { count } = useCarrito();

  return (
    <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur border-b border-caramelo/20">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        {/* Campanita izquierda */}
        <div className="w-10 flex items-center justify-center">
          <NotificationBell />
        </div>

        <Link href="/catalogo" className="flex items-center">
          <Image
            src="/logos/logo-06.png"
            alt="Masa Mía"
            width={360}
            height={108}
            priority
            style={{ height: 56, width: "auto" }}
          />
        </Link>

        <Link
          href="/carrito"
          aria-label="Mi antojo"
          className="relative w-9 h-9 flex items-center justify-center active:scale-95 transition"
        >
          <IconShoppingBag
            size={22}
            stroke={2}
            className={count > 0 ? "text-antojo" : "text-cafe"}
          />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-antojo text-white text-[11px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 shadow">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
