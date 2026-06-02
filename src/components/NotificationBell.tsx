"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBell,
  IconBellRinging,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import {
  formatRelativeTime,
  groupByDay,
  type Notification,
} from "@/lib/notifications";

/**
 * Campanita de notificaciones del cliente.
 * - Badge con count de no leídas
 * - Panel dropdown con las últimas 15
 * - Realtime: nuevas aparecen al instante
 * - Marca como leídas al abrir el panel
 */
export default function NotificationBell() {
  const router = useRouter();
  const { cliente } = useCarrito();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ring, setRing] = useState(false);
  const prevUnreadRef = useRef(0);

  // Cargar notificaciones iniciales + realtime
  useEffect(() => {
    if (!cliente?.id) return;
    const supabase = createClient();

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("customer_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(15);
      setNotifs((data ?? []) as Notification[]);
      setLoading(false);
    };
    fetchNotifs();

    const channel = supabase
      .channel(`notif-${cliente.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `customer_id=eq.${cliente.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifs((curr) => [newNotif, ...curr].slice(0, 15));
          // Anima la campanita
          setRing(true);
          window.setTimeout(() => setRing(false), 1200);
          // Haptic feedback
          try {
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate([30, 60, 30]);
            }
          } catch {}
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `customer_id=eq.${cliente.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifs((curr) =>
            curr.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente?.id]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Ring también cuando aumenta el unread por carga inicial
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
      setRing(true);
      window.setTimeout(() => setRing(false), 1200);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const markAllAsRead = async () => {
    if (!cliente?.id) return;
    const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    // Optimista: marca en UI inmediatamente para evitar que reaparezca si el
    // usuario cierra antes de que vuelva la respuesta de Supabase.
    setNotifs((curr) =>
      curr.map((n) =>
        unreadIds.includes(n.id) ? { ...n, read: true, read_at: now } : n
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: now })
      .in("id", unreadIds);
    if (error) console.error("mark notifs read failed", error);
  };

  const handleOpen = async () => {
    setOpen(true);
    // Marca como leídas al abrir, sin delay — si lo retrasamos y el usuario
    // cierra antes, las notificaciones reaparecen como nuevas (bug confirmado).
    markAllAsRead();
  };

  const handleClickNotif = async (notif: Notification) => {
    if (!notif.read) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notif.id);
    }
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  if (!cliente?.id) return null;

  const grouped = groupByDay(notifs);

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative w-9 h-9 flex items-center justify-center active:scale-95 transition"
      >
        {ring ? (
          <IconBellRinging
            size={22}
            className="text-antojo bell-shake"
            stroke={2.2}
          />
        ) : (
          <IconBell
            size={22}
            className={unreadCount > 0 ? "text-antojo" : "text-cafe"}
            stroke={2}
          />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-antojo text-white text-[11px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[65] bg-cafe/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute top-14 right-3 left-3 sm:left-auto sm:w-96 bg-crema rounded-2xl shadow-2xl max-h-[75vh] overflow-hidden flex flex-col panel-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-caramelo/20 bg-white">
              <div className="flex items-center gap-2">
                <IconBell size={18} className="text-antojo" />
                <h2
                  className="text-sm font-bold text-cafe"
                  style={{ fontFamily: "Termina" }}
                >
                  Notificaciones
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-antojo text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-canela p-1 active:scale-90"
                aria-label="Cerrar"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-canela text-xs">
                  Cargando…
                </div>
              ) : notifs.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-xs text-canela leading-relaxed">
                    Sin notificaciones todavía.
                    <br />
                    <span className="text-caramelo italic">
                      Aquí caen las novedades de tus pedidos.
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <div className="px-4 py-1.5 bg-crema-soft sticky top-0 z-10">
                        <span className="text-[11px] font-bold text-canela uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleClickNotif(n)}
                          className={`w-full px-4 py-3 flex items-start gap-3 text-left active:bg-canela/10 transition border-b border-caramelo/10 ${
                            !n.read ? "bg-antojo/5" : ""
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                            {n.emoji || "🔔"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-xs leading-tight ${
                                !n.read
                                  ? "font-bold text-cafe"
                                  : "text-canela"
                              }`}
                              style={{ fontFamily: "Termina" }}
                            >
                              {n.title}
                            </div>
                            {n.body && (
                              <p className="text-[11px] text-canela mt-0.5 leading-snug line-clamp-2">
                                {n.body}
                              </p>
                            )}
                            <div className="text-[11px] text-caramelo mt-1">
                              {formatRelativeTime(n.created_at)}
                            </div>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 bg-antojo rounded-full flex-shrink-0 mt-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="border-t border-caramelo/20 px-3 py-2 bg-white flex items-center justify-between">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-[11px] font-bold text-cafe flex items-center gap-1 active:scale-95 disabled:opacity-30"
                >
                  <IconCheck size={12} />
                  Marcar todo leído
                </button>
                <Link
                  href="/notificaciones"
                  onClick={() => setOpen(false)}
                  className="text-[11px] font-bold text-antojo"
                >
                  Ver todas →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bellShake {
          0%,
          100% {
            transform: rotate(0deg);
          }
          15% {
            transform: rotate(-18deg);
          }
          30% {
            transform: rotate(14deg);
          }
          45% {
            transform: rotate(-10deg);
          }
          60% {
            transform: rotate(7deg);
          }
          75% {
            transform: rotate(-4deg);
          }
          90% {
            transform: rotate(2deg);
          }
        }
        :global(.bell-shake) {
          animation: bellShake 0.85s ease-in-out;
          transform-origin: 50% 10%;
        }
      `}</style>
    </>
  );
}
