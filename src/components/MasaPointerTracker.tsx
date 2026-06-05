"use client";

import { useEffect } from "react";

/**
 * Trackea el pointer globalmente para todos los elementos con clase
 * `.btn-masa` (primary, antojame, plus, mini, secondary). Setea las CSS
 * variables `--mx` y `--my` en cada botón con la posición del dedo en
 * porcentaje, y agrega/quita la clase `.is-pressed`.
 *
 * El radial-gradient definido en globals.css usa esas variables para
 * dibujar la "huella" del dedo donde realmente tocaste, no en el centro.
 *
 * Se monta UNA sola vez (desde el CarritoProvider que envuelve toda la
 * app) y captura eventos delegados a nivel document para no tener que
 * registrar listeners por botón.
 */
export default function MasaPointerTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const findBtn = (target: EventTarget | null): HTMLElement | null => {
      let el = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains("btn-masa")) return el;
        el = el.parentElement;
      }
      return null;
    };

    const setHuella = (btn: HTMLElement, clientX: number, clientY: number) => {
      const rect = btn.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty("--mx", x + "%");
      btn.style.setProperty("--my", y + "%");
    };

    const onDown = (e: PointerEvent) => {
      const btn = findBtn(e.target);
      if (!btn) return;
      setHuella(btn, e.clientX, e.clientY);
      btn.classList.add("is-pressed");
    };

    const onMove = (e: PointerEvent) => {
      const btn = findBtn(e.target);
      if (!btn || !btn.classList.contains("is-pressed")) return;
      setHuella(btn, e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      // Limpiar TODOS los .is-pressed (puede haber más de uno si el dedo
      // se movió rápido entre botones)
      document.querySelectorAll(".btn-masa.is-pressed").forEach((b) => {
        b.classList.remove("is-pressed");
      });
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return null;
}
