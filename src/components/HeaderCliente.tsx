"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrito } from "./CarritoProvider";
import NotificationBell from "./NotificationBell";
import { createClient } from "@/lib/supabase";
import { IconShoppingBag } from "@tabler/icons-react";

export default function HeaderCliente() {
  const { count } = useCarrito();
  const router = useRouter();

  // Detecta sesión staff (Alex, Faby, etc.) para habilitar el "gesto secreto"
  // sobre el logo. Para clientes normales el logo se comporta igual que siempre.
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setIsStaff(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive) setIsStaff(!!session?.user);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Gesto secreto: mantener presionado el logo ~0.6s estando logueado como
  // staff → te lleva al panel de cocina. Un toque normal sigue yendo al inicio.
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);

  const startPress = () => {
    if (!isStaff) return;
    longFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      longFired.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(25);
      }
      router.push("/staff/pedidos");
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onLogoClick = (e: React.MouseEvent) => {
    // Si fue mantener-presionado (staff), cancelamos la navegación normal.
    if (longFired.current) {
      e.preventDefault();
      longFired.current = false;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur border-b border-caramelo/20">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2.5">
        {/* Campanita izquierda */}
        <div className="w-10 flex items-center justify-center">
          <NotificationBell />
        </div>

        {/* Logo masa mía. Para staff: mantener presionado abre el panel. */}
        <Link
          href="/catalogo"
          className="flex items-center select-none"
          onClick={onLogoClick}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => {
            // Evita el menú "guardar imagen" al mantener presionado en móvil.
            if (isStaff) e.preventDefault();
          }}
          style={{ WebkitTouchCallout: "none" }}
        >
          <Image
            src="/logos/logo-main.png"
            alt="Masa Mía"
            width={480}
            height={144}
            priority
            draggable={false}
            style={{ height: 64, width: "auto" }}
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
