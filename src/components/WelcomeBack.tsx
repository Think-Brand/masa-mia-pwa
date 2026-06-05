"use client";

import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useCarrito } from "@/components/CarritoProvider";
import { createClient } from "@/lib/supabase";

/**
 * Banner de bienvenida para el cliente que vuelve.
 *
 * Lógica:
 *  - Si hay `cliente` cargado en CarritoProvider (osea, está identificado)
 *    Y tiene al menos 1 pedido previo → mostramos el banner UNA VEZ por
 *    sesión.
 *  - Cierra con tap (X) o al primer scroll del catálogo.
 *  - Tono Miga: cercano y con antojo.
 */

const SESSION_KEY = "masamia:welcomed";

export default function WelcomeBack() {
  const { cliente } = useCarrito();
  const [show, setShow] = useState(false);
  const [primerNombre, setPrimerNombre] = useState<string>("");

  useEffect(() => {
    if (!cliente?.id) return;
    // Ya saludado en esta sesión?
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {}

    let cancelled = false;
    const check = async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", cliente.id);
      if (cancelled) return;
      if ((count ?? 0) >= 1) {
        setPrimerNombre(cliente.name?.split(" ")[0] ?? "");
        setShow(true);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {}
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [cliente?.id, cliente?.name]);

  // Cerrar automáticamente al primer scroll del usuario (gesto de avance)
  useEffect(() => {
    if (!show) return;
    const onScroll = () => setShow(false);
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed top-[88px] left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1rem)] max-w-md pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <div className="bg-crema border-2 border-antojo/40 rounded-2xl shadow-xl p-3 flex items-center gap-3 cortesia-pop">
        <Image
          src="/mascota/miga-adorable.png"
          alt=""
          width={48}
          height={48}
          className="flex-shrink-0"
          priority
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm text-cafe leading-tight"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ¡Hola de nuevo{primerNombre ? `, ${primerNombre}` : ""}! 🥐
          </div>
          <div className="text-[11px] text-canela leading-snug mt-0.5">
            Qué bueno verte por aquí otra vez. ¿Qué se te antoja hoy?
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          aria-label="Cerrar"
          className="text-canela p-1 active:scale-90 transition flex-shrink-0"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
