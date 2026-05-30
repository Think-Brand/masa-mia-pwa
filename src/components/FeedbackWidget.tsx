"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconCheck, IconMessageHeart, IconX } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";

const DISMISS_KEY = "masamia:pilot:dismissed-at";

const RATINGS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Mal" },
  { value: 2, emoji: "😐", label: "Regular" },
  { value: 3, emoji: "🙂", label: "Bien" },
  { value: 4, emoji: "😍", label: "Increíble" },
];

export default function FeedbackWidget() {
  const pathname = usePathname();
  const { cliente } = useCarrito();
  const [pilotMode, setPilotMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // NO mostrar en rutas staff
  const isStaff = pathname?.startsWith("/staff");

  // Verificar si piloto está activo
  useEffect(() => {
    if (isStaff) return;
    const supabase = createClient();
    supabase
      .from("settings")
      .select("value")
      .eq("key", "pilot_mode")
      .maybeSingle()
      .then(({ data }) => {
        setPilotMode(data?.value === "on");
      });
  }, [isStaff]);

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("pilot_feedback").insert({
      rating,
      comment: comment.trim() || null,
      page: pathname,
      customer_id: cliente?.id ?? null,
      customer_name: cliente?.name ?? null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSent(true);
    setSending(false);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setRating(null);
      setComment("");
    }, 1800);
  };

  if (isStaff || !pilotMode) return null;

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Danos feedback"
          className="fixed right-4 z-40 bg-antojo text-white rounded-full shadow-2xl flex items-center gap-2 px-4 py-3 active:scale-95 transition animate-pulse"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          <IconMessageHeart size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Tu feedback
          </span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-cafe/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => !sending && !sent && setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl p-5 pb-8 fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-3" />

            {sent ? (
              <div className="text-center py-8 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-verde text-white flex items-center justify-center">
                  <IconCheck size={32} />
                </div>
                <div
                  className="text-2xl text-cafe leading-none mt-2"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  ¡Gracias!
                </div>
                <p className="text-xs text-canela italic">
                  Cada comentario nos hace mejor 🤎
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2
                    className="text-xl text-cafe"
                    style={{ fontFamily: "ReginaBlack" }}
                  >
                    ¿Cómo te va?
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-canela p-1 active:scale-90"
                  >
                    <IconX size={20} />
                  </button>
                </div>
                <p className="text-[11px] text-canela mb-4">
                  Estamos en prueba piloto. Tu opinión vale oro.
                </p>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {RATINGS.map((r) => {
                    const active = rating === r.value;
                    return (
                      <button
                        key={r.value}
                        onClick={() => setRating(r.value)}
                        className={`bg-white rounded-xl p-3 flex flex-col items-center gap-1 transition active:scale-95 ${
                          active
                            ? "ring-2 ring-antojo shadow-md"
                            : "shadow-sm"
                        }`}
                      >
                        <span className="text-2xl">{r.emoji}</span>
                        <span
                          className="text-[10px] font-bold text-cafe"
                          style={{ fontFamily: "Termina" }}
                        >
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {rating && (
                  <div className="fade-up">
                    <label className="text-[10px] font-bold text-canela uppercase tracking-wider">
                      Cuéntanos qué piensas (opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Qué te gustó, qué cambiarías, qué confundió…"
                      className="mt-1 w-full bg-white border border-caramelo/40 rounded-xl px-3 py-2 text-xs text-cafe focus:outline-none focus:border-cafe resize-none placeholder:text-canela/60"
                    />
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={!rating || sending}
                  className="w-full mt-4 bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 shadow-md"
                >
                  {sending ? "Enviando…" : "Enviar feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
