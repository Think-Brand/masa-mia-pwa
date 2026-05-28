"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconShoppingBag,
  IconReceipt2,
  IconUser,
} from "@tabler/icons-react";
import { useCarrito } from "./CarritoProvider";

const ITEMS = [
  { href: "/catalogo", label: "Inicio", Icon: IconHome },
  { href: "/carrito", label: "Mi antojo", Icon: IconShoppingBag, badgeKey: "count" as const },
  { href: "/mis-pedidos", label: "Mis pedidos", Icon: IconReceipt2 },
  { href: "/yo", label: "Yo", Icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCarrito();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-caramelo/20 shadow-[0_-4px_12px_rgba(58,39,29,0.08)]">
      <div className="grid grid-cols-4 px-2 pt-1.5 pb-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/catalogo"
              ? pathname.startsWith("/catalogo") ||
                pathname.startsWith("/producto") ||
                pathname.startsWith("/box")
              : pathname.startsWith(item.href);
          const badgeCount =
            item.badgeKey === "count" && count > 0 ? count : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
                active ? "text-antojo" : "text-canela"
              }`}
            >
              <div className="relative">
                <item.Icon size={22} stroke={active ? 2.4 : 1.8} />
                {badgeCount !== null && (
                  <span className="absolute -top-1.5 -right-2 bg-antojo text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span
                className="text-[9.5px] font-bold"
                style={{ fontFamily: "Termina" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
