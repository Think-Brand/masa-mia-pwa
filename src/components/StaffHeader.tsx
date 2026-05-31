"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  IconLogout,
  IconReceipt2,
  IconSettings,
  IconChartBar,
  IconChefHat,
  IconDashboard,
  IconEye,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type Props = { userName: string };

export default function StaffHeader({ userName }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/staff/login");
    router.refresh();
  };

  const nav = [
    { href: "/staff/pedidos", label: "Pedidos", Icon: IconReceipt2 },
    { href: "/staff/cocina", label: "Cocina", Icon: IconChefHat },
    { href: "/staff/dashboard", label: "Datos", Icon: IconDashboard },
    { href: "/staff/ajustes", label: "Ajustes", Icon: IconSettings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-cafe text-crema">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/staff/pedidos" className="flex items-center gap-2">
          <Image
            src="/mascota/miga-chef.png"
            alt="Miga Chef"
            width={36}
            height={36}
            className="w-9 h-9 object-contain"
          />
          <div>
            <div
              className="text-base leading-none"
              style={{ fontFamily: "ReginaBlack" }}
            >
              Masa Mía
            </div>
            <div className="text-[9px] uppercase tracking-widest text-caramelo">
              Cocina
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <div className="text-[11px] text-caramelo mr-1 hidden sm:block">
            {userName}
          </div>
          <Link
            href="/catalogo"
            aria-label="Ver como cliente"
            title="Ver la tienda como cliente"
            className="text-crema p-2 rounded-lg active:scale-90 transition flex items-center gap-1 text-[10px] font-bold"
            style={{ fontFamily: "Termina" }}
          >
            <IconEye size={16} />
            <span className="hidden sm:inline">Vista cliente</span>
          </Link>
          <button
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            className="text-crema p-2 rounded-lg active:scale-90 transition"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </div>
      <nav className="bg-cafe border-t border-caramelo/20">
        <div className="max-w-2xl mx-auto flex">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${
                  active
                    ? "text-antojo border-b-2 border-antojo"
                    : "text-crema/70"
                }`}
                style={{ fontFamily: "Termina" }}
              >
                <n.Icon size={14} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
