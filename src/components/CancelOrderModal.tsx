"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconX, IconAlertTriangle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import {
  MIN_HOURS_TO_CANCEL,
  checkCancelEligibility,
} from "@/lib/cancellation";

const REASONS = [
  "Ya no podré recogerlo",
  "Encontré otro plan",
  "Cambié de antojo",
  "Por error / equivoqué la fecha",
  "Otro motivo",
];

type Props = {
  open: boolean;
  onClose: () => void;
  order: {
    id: string;
    folio: string;
    status: string;
    pickup_date: string | null;
  };
  onCancelled?: () => void;
};

export default function CancelOrderModal({
  open,
  onClose,
  order,
  onCancelled,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const eligibility = checkCancelEligibility(order);

  const cancelar = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Re-validar al momento de cancelar
      const recheck = checkCancelEligibility(order);
      if (!recheck.canCancel) {
        setError(recheck.reason);
        setSubmitting(false);
        return;
      }
      const supabase = createClient();
      const finalReason = comment.trim()
        ? `${reason} — ${comment.trim()}`
        : reason;
      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_by: "customer",
          cancel_reason: finalReason,
        })
        .eq("id", order.id);
      if (updErr) throw updErr;
      onCancelled?.();
      router.refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Algo se atascó. Intenta otra vez o avísanos por WhatsApp.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-cafe/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl modal-enter max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex justify-end -mt-2 -mr-2">
          <button
            onClick={onClose}
            className="text-canela p-1 active:scale-90"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="text-center">
          <Image
            src="/mascota/miga-sentada.png"
            alt="Miga"
            width={110}
            height={110}
            className="mx-auto"
            priority
          />
          <h2
            className="text-3xl text-cafe leading-none mt-2"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Cancelar pedido
          </h2>
          <p className="text-xs text-canela mt-2">
            Folio <b className="text-cafe">{order.folio}</b>
          </p>
        </div>

        {!eligibility.canCancel ? (
          <div className="mt-5 bg-white/80 border-2 border-caramelo/40 rounded-2xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-caramelo/20 rounded-full p-2.5">
                <IconAlertTriangle size={22} className="text-caramelo" />
              </div>
            </div>
            <p className="text-xs text-canela leading-relaxed max-w-xs mx-auto">
              {eligibility.reason}
            </p>
            <a
              href="https://wa.me/5218110050755"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-[#25D366] text-white rounded-2xl px-5 py-2.5 text-xs font-bold active:scale-95 transition"
            >
              Escribirnos por WhatsApp
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs text-canela mt-4 text-center leading-relaxed">
              Faltan {eligibility.hoursToPickup}h para tu entrega — todavía
              estás a tiempo. Cuéntanos qué pasó:
            </p>

            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition active:scale-[0.99] ${
                    reason === r
                      ? "bg-cafe text-crema shadow-md"
                      : "bg-white text-cafe border border-caramelo/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Quieres contarnos más? (opcional)"
              rows={2}
              className="mt-3 w-full bg-white border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe placeholder:text-canela/50 focus:outline-none focus:border-cafe resize-none"
            />

            {error && (
              <p className="text-xs text-rojo text-center mt-2">{error}</p>
            )}

            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={cancelar}
                disabled={submitting}
                className="w-full bg-rojo text-white rounded-2xl py-3.5 text-sm font-bold active:scale-[0.98] transition disabled:opacity-50 shadow-md"
              >
                {submitting ? "Cancelando…" : "Sí, cancelar pedido"}
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-xs text-canela py-2 active:scale-95"
              >
                Mejor lo dejo así
              </button>
            </div>

            <p className="text-[11px] text-canela text-center mt-3 italic max-w-xs mx-auto leading-relaxed">
              Mientras falten más de {MIN_HOURS_TO_CANCEL}h, puedes cancelar
              sin pena. Después solo por WhatsApp 🤎
            </p>
          </>
        )}
      </div>
    </div>
  );
}
