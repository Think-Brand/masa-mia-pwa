"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { IconArrowRight, IconX } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { isTourCompleted, markTourCompleted } from "@/lib/onboarding";
import { useModalA11y } from "@/lib/useModalA11y";

export type TourStep = {
  /** Nombre completo del archivo en /public/mascota/, ej: "miga-adorable.png" */
  image: string;
  title: string;
  body: string;
};

type Props = {
  tourId: string;
  steps: TourStep[];
  /** Si true, ignora pilot_mode y siempre se muestra (para "ver tour de nuevo") */
  forceShow?: boolean;
  /** Callback cuando el tour se cierra */
  onClose?: () => void;
};

/**
 * Tour de bienvenida con Miga como guía.
 * - Solo aparece si pilot_mode = "on" (a menos que forceShow=true)
 * - Solo aparece si el tour no se ha completado
 * - Se guarda en localStorage al cerrar/terminar
 */
export default function OnboardingTour({
  tourId,
  steps,
  forceShow = false,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    if (isTourCompleted(tourId)) return;

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("settings")
      .select("value")
      .eq("key", "pilot_mode")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.value === "on") {
          // Pausita para que la pantalla detrás termine de cargar
          setTimeout(() => {
            if (cancelled) return;
            setVisible(true);
            // Marca como visto AL MOSTRARSE — si el usuario cierra con back,
            // recarga, o no termina el tour, igual no le aparece otra vez.
            // Para re-ver, hay botón "Ver tour" en Ajustes (forceShow=true).
            markTourCompleted(tourId);
          }, 600);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tourId, forceShow]);

  const close = () => {
    if (!forceShow) markTourCompleted(tourId);
    setVisible(false);
    onClose?.();
  };

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else close();
  };

  const panelRef = useModalA11y<HTMLDivElement>(visible, close);

  if (!visible) return null;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] bg-cafe/80 backdrop-blur-md flex items-center justify-center px-4"
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="w-full max-w-md bg-crema rounded-3xl p-6 shadow-2xl fade-up relative focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cerrar */}
        <button
          onClick={close}
          className="absolute top-3 right-3 text-canela p-1 active:scale-90"
          aria-label="Cerrar tour"
        >
          <IconX size={20} />
        </button>

        {/* Barra de progreso (pasitos de masa) */}
        <div className="flex gap-1.5 justify-center mb-4 mt-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-antojo"
                  : i < index
                    ? "w-2 bg-antojo/60"
                    : "w-2 bg-canela/30"
              }`}
            />
          ))}
        </div>

        {/* Miga + contenido */}
        <div className="text-center">
          <Image
            key={step.image}
            src={`/mascota/${step.image}`}
            alt="Miga guía"
            width={140}
            height={140}
            className="mx-auto fade-up"
            priority
          />
          <h2
            id="tour-title"
            className="text-3xl text-cafe leading-none mt-2"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {step.title}
          </h2>
          <p className="text-sm text-canela mt-3 max-w-xs mx-auto leading-relaxed whitespace-pre-line">
            {step.body}
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={next}
            className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
          >
            {isLast ? (
              <>¡A hornear!</>
            ) : (
              <>
                Siguiente <IconArrowRight size={16} />
              </>
            )}
          </button>
          {!isLast && (
            <button
              onClick={close}
              className="text-xs text-canela py-2 active:scale-95"
            >
              Saltar tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
