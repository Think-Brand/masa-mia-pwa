"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconBell } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";
import Miga from "@/components/Miga";
import MigaLoading from "@/components/MigaLoading";
import {
  formatRelativeTime,
  groupByDay,
  type Notification,
} from "@/lib/notifications";

export default function NotificacionesPage() {
  const router = useRouter();
  const { cliente, ready } = useCarrito();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esperar a que CarritoProvider termine de leer localStorage
    // (evita redirect falso al primer render).
    if (!ready) return;
    // Detección de cliente fantasma (logout legacy con name vacío).
    const valido =
      !!cliente &&
      !!cliente.id &&
      !!cliente.name?.trim() &&
      !!cliente.whatsapp &&
      cliente.whatsapp.length === 10;
    if (!cliente || !valido) {
      router.replace("/");
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("customer_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setNotifs((data ?? []) as Notification[]);
      setLoading(false);
      // Marcar como leídas al entrar a esta vista
      const unreadIds = (data ?? [])
        .filter((n: any) => !n.read)
        .map((n: any) => n.id);
      if (unreadIds.length > 0) {
        const now = new Date().toISOString();
        await supabase
          .from("notifications")
          .update({ read: true, read_at: now })
          .in("id", unreadIds);
      }
    })();
  }, [cliente, router, ready]);

  if (!ready || !cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MigaLoading frase="Revisando avisos…" size={180} />
      </div>
    );
  }

  const grouped = groupByDay(notifs);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24 bg-crema">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-caramelo/20">
        <Link href="/catalogo" aria-label="Atrás" className="text-cafe">
          <IconArrowLeft size={20} />
        </Link>
        <h1
          className="text-2xl text-cafe flex items-center gap-2"
          style={{ fontFamily: "ReginaBlack" }}
        >
          <IconBell size={20} className="text-antojo" />
          Avisos
        </h1>
        <div className="w-5" />
      </header>

      <div className="flex-1 px-3 pt-3">
        {loading ? (
          <div className="text-center py-10 text-canela text-sm">
            Buscando tus novedades…
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
            <Miga emocion="dormida" animation="sway" size={200} />
            <p className="text-canela text-sm leading-relaxed max-w-xs">
              Sin notificaciones todavía.
              <br />
              <span className="text-caramelo italic">
                Aquí caen las novedades de tus pedidos y los avisos cariñosos
                que Miga te quiera mandar.
              </span>
            </p>
            <Link
              href="/catalogo"
              className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition"
            >
              Volver al menú
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <section key={group.label}>
                <div className="px-2 pb-1.5">
                  <span className="text-[11px] font-bold text-canela uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <ul className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {group.items.map((n, i) => {
                    const inner = (
                      <div className="px-3 py-3 flex items-start gap-3 active:bg-canela/5 transition">
                        <div className="w-10 h-10 rounded-full bg-crema-soft flex items-center justify-center text-xl flex-shrink-0">
                          {n.emoji || "🔔"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-bold text-cafe leading-tight"
                            style={{ fontFamily: "Termina" }}
                          >
                            {n.title}
                          </div>
                          {n.body && (
                            <p className="text-xs text-canela mt-1 leading-snug">
                              {n.body}
                            </p>
                          )}
                          <div className="text-[11px] text-caramelo mt-1">
                            {formatRelativeTime(n.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <li
                        key={n.id}
                        className={
                          i < group.items.length - 1
                            ? "border-b border-caramelo/15"
                            : ""
                        }
                      >
                        {n.link ? (
                          <Link href={n.link}>{inner}</Link>
                        ) : (
                          <div>{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
