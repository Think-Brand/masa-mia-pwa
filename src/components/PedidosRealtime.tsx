"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBell,
  IconBellOff,
  IconReceipt2,
  IconVolume,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

const SOUND_KEY = "masamia:staff:sound";

// Sintetiza una pequeña campanita (dos notas suaves) con Web Audio API
function playBell() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 880, start: 0, dur: 0.25 }, // A5
      { freq: 1318.5, start: 0.12, dur: 0.4 }, // E6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });

    // Cerrar el contexto después
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
}

type Props = {
  initialPendingCount: number;
};

export default function PedidosRealtime({ initialPendingCount }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPendingCount);
  const [soundOn, setSoundOn] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Cargar preferencia de sonido
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_KEY);
      if (stored !== null) setSoundOn(stored === "1");
    } catch {}
  }, []);

  // Guardar preferencia
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    } catch {}
  }, [soundOn]);

  // Suscripción Realtime a inserts en orders
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("staff-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const folio = (payload.new as any)?.folio ?? "MM";
          setPending((p) => p + 1);
          setToastMsg(`🛎️ Pedido nuevo: ${folio}`);
          if (soundOn) playBell();
          // refrescar SSR de la lista en 1 seg
          setTimeout(() => router.refresh(), 1000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundOn, router]);

  // Auto-ocultar toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  return (
    <>
      {/* Controles arriba */}
      <div className="flex items-center justify-between mt-3 mb-3 gap-2">
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="inline-flex items-center gap-1 bg-antojo text-white text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              <IconReceipt2 size={12} />
              {pending} {pending === 1 ? "pendiente" : "pendientes"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playBell();
              setToastMsg("🛎️ Sonido de prueba");
            }}
            className="text-xs text-canela flex items-center gap-1 active:scale-95 transition bg-white px-2.5 py-1 rounded-full shadow-sm"
            title="Probar sonido"
          >
            <IconVolume size={14} />
            Probar
          </button>
          <button
            onClick={() => setSoundOn((v) => !v)}
            className="text-xs text-canela flex items-center gap-1 active:scale-95 transition"
            title={soundOn ? "Desactivar sonido" : "Activar sonido"}
          >
            {soundOn ? <IconBell size={14} /> : <IconBellOff size={14} />}
            {soundOn ? "Sonido on" : "Sonido off"}
          </button>
        </div>
      </div>

      {/* Toast pedido nuevo — transition retargetable (Emil), el div siempre
          está montado para que cambios rápidos de toastMsg interrumpan suave
          la animación anterior en vez de hacer cola. */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-antojo text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold pointer-events-none ${
          toastMsg
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-3"
        }`}
        style={{
          fontFamily: "Termina",
          fontSize: 13,
          transition:
            "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {toastMsg ?? " "}
      </div>
    </>
  );
}
