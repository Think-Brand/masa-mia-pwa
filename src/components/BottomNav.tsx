"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(count);

  // Animar el badge cuando aumenta el count (no al disminuir)
  useEffect(() => {
    if (count > prevCount.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 700);
      return () => window.clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-caramelo/20 shadow-[0_-4px_12px_rgba(58,39,29,0.08)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        pointerEvents: "auto",
      }}
    >
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
              <div
                className={`relative ${
                  item.badgeKey === "count" && pulse ? "cart-bounce" : ""
                }`}
              >
                <item.Icon size={22} stroke={active ? 2.4 : 1.8} />
                {badgeCount !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2 bg-antojo text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md ${
                      pulse && item.badgeKey === "count"
                        ? "badge-pop"
                        : ""
                    }`}
                  >
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

      <style jsx>{`
        @keyframes cartBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          35% {
            transform: translateY(-6px) scale(1.08);
          }
          70% {
            transform: translateY(1px) scale(0.98);
          }
        }
        @keyframes badgePop {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.3);
            background-color: #5b7a3a;
          }
          100% {
            transform: scale(1);
          }
        }
        .cart-bounce {
          animation: cartBounce 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .badge-pop {
          animation: badgePop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </nav>
  );
}
