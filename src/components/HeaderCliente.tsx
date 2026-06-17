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

  // Gesto secreto (solo staff): 3 clics rápidos sobre el logo → panel de
  // cocina. Cambiamos el viejo "mantener presionado" porque en PC el hold
  // activaba la copia/arrastre de la imagen. Para clientes el logo es un Link
  // normal a inicio; para staff interceptamos el clic y, si no llegan 3 a
  // tiempo, navegamos a inicio como siempre (con un pelín de retraso).
  const clickCount = useRef(0);
  const clickTimer = useRef<number | null>(null);
  const TRIPLE_WINDOW_MS = 450; // ventana entre clics

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  const onLogoClick = (e: React.MouseEvent) => {
    // Cliente normal: dejar que el Link navegue a /catalogo.
    if (!isStaff) return;

    // Staff: nosotros controlamos la navegación.
    e.preventDefault();
    clickCount.current += 1;

    if (clickCount.current >= 3) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = null;
      clickCount.current = 0;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(25);
      }
      router.push("/staff/cocina");
      return;
    }

    // Aún no son 3: reinicia la ventana. Si expira, fue un clic normal → inicio.
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => {
      clickCount.current = 0;
      clickTimer.current = null;
      router.push("/catalogo");
    }, TRIPLE_WINDOW_MS);
  };

  return (
    <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur border-b border-caramelo/20">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2.5">
        {/* Campanita izquierda */}
        <div className="w-10 flex items-center justify-center">
          <NotificationBell />
        </div>

        {/* Logo masa mía. Para staff: 3 clics rápidos abren el panel. */}
        <Link
          href="/catalogo"
          className="flex items-center select-none"
          onClick={onLogoClick}
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
