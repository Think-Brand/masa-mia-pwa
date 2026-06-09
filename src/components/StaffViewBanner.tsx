"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconChefHat, IconArrowBackUp } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

/**
 * Banner flotante visible SOLO cuando:
 *  - El usuario tiene una sesión Supabase activa (staff logueado)
 *  - Y está navegando rutas de cliente (no /staff/*)
 *
 * Permite regresar al panel de staff de un toque sin cerrar sesión.
 * Para clientes anónimos no se renderiza nada.
 */
export default function StaffViewBanner() {
  const pathname = usePathname();
  const [isStaff, setIsStaff] = useState(false);
  const [checked, setChecked] = useState(false);

  // Detecta sesión staff (Supabase auth) en cliente
  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setIsStaff(!!data.user);
      setChecked(true);
    });

    // Escucha cambios (login/logout) para refrescar
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setIsStaff(!!session?.user);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // No mostrar en rutas de staff ni mientras verifica
  const onStaffRoute = pathname?.startsWith("/staff");
  if (!checked || !isStaff || onStaffRoute) return null;

  // Pastilla compacta arriba a la derecha, debajo del header para no tapar
  // el carrito ni estorbar el flujo de compra.
  return (
    <Link
      href="/staff/pedidos"
      className="fixed right-3 z-[55] bg-cafe text-crema rounded-full pl-1.5 pr-3 py-1.5 shadow-xl flex items-center gap-1.5 active:scale-95 transition"
      style={{
        fontFamily: "Termina",
        top: "calc(env(safe-area-inset-top, 0px) + 92px)",
      }}
      aria-label="Volver al panel de cocina"
    >
      <span className="relative flex items-center justify-center w-6 h-6 bg-antojo rounded-full">
        <IconChefHat size={14} />
      </span>
      <span className="text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
        <IconArrowBackUp size={12} />
        Volver al panel
      </span>
    </Link>
  );
}
