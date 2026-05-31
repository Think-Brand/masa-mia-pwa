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

  return (
    <Link
      href="/staff/pedidos"
      className="fixed bottom-20 right-3 z-[60] bg-cafe text-crema rounded-full pl-3 pr-4 py-2 shadow-2xl flex items-center gap-2 active:scale-95 transition"
      style={{ fontFamily: "Termina" }}
      aria-label="Volver al panel de cocina"
    >
      <span className="relative flex items-center justify-center w-7 h-7 bg-antojo rounded-full">
        <IconChefHat size={16} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[8px] uppercase tracking-widest text-caramelo">
          Vista cliente
        </span>
        <span className="text-[11px] font-bold flex items-center gap-1">
          <IconArrowBackUp size={12} />
          Volver al panel
        </span>
      </span>
    </Link>
  );
}
