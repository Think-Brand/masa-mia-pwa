"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import { useModalA11y } from "@/lib/useModalA11y";

const SHOWN_KEY = "masamia:feedback:shown";

const RATINGS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Mal" },
  { value: 2, emoji: "😐", label: "Regular" },
  { value: 3, emoji: "🙂", label: "Bien" },
  { value: 4, emoji: "😍", label: "Increíble" },
];

type Props = {
  folio: string;
  page?: string;
};

/**
 * Popup que aparece después de confirmar un pedido (cuando piloto está ON).
 * Se muestra una sola vez por folio (guarda en localStorage).
 */
export default function FeedbackPopup({ folio, page }: Props) {
  const { cliente } = useCarrito();
  const [pilotMode, setPilotMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("settings")
      .select("value")
      .eq("key", "pilot_mode")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value !== "on") return;
        // Solo mostrar 1 vez por folio
        try {
          const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]");
          if (shown.includes(folio)) return;
        } catch {}
        setPilotMode(true);
        // Mostrar después de 1.5s para que la confirmación se aprecie primero
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
      });
  }, [folio]);

  const markShown = () => {
    try {
      const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]");
      shown.push(folio);
      localStorage.setItem(SHOWN_KEY, JSON.stringify(shown.slice(-50)));
    } catch {}
  };

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("pilot_feedback").insert({
      rating,
      comment: comment.trim() || null,
      page: page || "/confirmacion",
      customer_id: cliente?.id ?? null,
      customer_name: cliente?.name ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSent(true);
    setSending(false);
    markShown();
    setTimeout(() => setOpen(false), 2200);
  };

  const dismiss = () => {
    markShown();
    setOpen(false);
  };

  const panelRef = useModalA11y<HTMLDivElement>(open, () => {
    if (!sending && !sent) dismiss();
  });

  if (!pilotMode || !open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-cafe/70 backdrop-blur-md flex items-center justify-center px-4"
      onClick={() => !sending && !sent && dismiss()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Encuesta de tu pedido"
        tabIndex={-1}
        className="w-full max-w-md bg-crema rounded-3xl p-6 shadow-2xl fade-up focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center py-6 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-verde text-white flex items-center justify-center shadow-lg">
              <IconCheck size={40} />
            </div>
            <div
              className="text-3xl text-cafe leading-none mt-2"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¡Gracias de corazón!
            </div>
            <p className="text-sm text-canela italic max-w-xs">
              Tu opinión es el ingrediente secreto.
              <br />
              Nos hace mejor 🤎
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end -mb-2">
              <button
                onClick={dismiss}
                className="text-canela p-1 active:scale-90"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="text-center">
              <Image
                src="/mascota/agradecida.png"
                alt="Miga agradecida"
                width={120}
                height={120}
                className="mx-auto"
                priority
              />
              <h2
                className="text-3xl text-cafe leading-none mt-2"
                style={{ fontFamily: "ReginaBlack" }}
              >
                ¿Cómo te fue?
              </h2>
              <p className="text-xs text-canela mt-2 max-w-xs mx-auto leading-relaxed">
                Estamos en prueba piloto. Tu opinión vale más que
                cualquier rol del menú.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-5">
              {RATINGS.map((r) => {
                const active = rating === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setRating(r.value)}
                    className={`bg-white rounded-2xl p-3 flex flex-col items-center gap-1 transition active:scale-95 ${
                      active ? "ring-2 ring-antojo shadow-lg" : "shadow-sm"
                    }`}
                  >
                    <span className="text-3xl">{r.emoji}</span>
                    <span
                      className="text-[11px] font-bold text-cafe"
                      style={{ fontFamily: "Termina" }}
                    >
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {rating && (
              <div className="mt-4 fade-up">
                <label
                  htmlFor="feedback-comment"
                  className="text-[11px] font-bold text-canela uppercase tracking-wider"
                >
                  Cuéntanos qué piensas (opcional pero amado)
                </label>
                <textarea
                  id="feedback-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Qué te gustó, qué te confundió, qué cambiarías…"
                  className="mt-1 w-full bg-white border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe focus:outline-none focus:border-cafe resize-none placeholder:text-canela/60"
                />
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={submit}
                disabled={!rating || sending}
                className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 shadow-md"
              >
                {sending ? "Enviando…" : "Enviar feedback"}
              </button>
              <button
                onClick={dismiss}
                disabled={sending}
                className="text-xs text-canela py-2 active:scale-95"
              >
                Tal vez después
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
