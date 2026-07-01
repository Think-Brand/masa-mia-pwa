"use client";

import { useEffect, useRef } from "react";

/**
 * Hook de accesibilidad para modales/diálogos.
 *
 * Devuelve un `ref` que se pega al PANEL del modal (el contenedor de
 * contenido, no el backdrop). Mientras `open` sea true encapsula:
 *
 *   1. Focus trap    — Tab / Shift+Tab circulan solo dentro del panel.
 *   2. Escape        — cierra el modal (llama onClose).
 *   3. Focus restore — al cerrar, devuelve el foco al elemento que lo abrió.
 *   4. Focus inicial — enfoca el panel (requiere tabIndex={-1}) para que el
 *                      lector de pantalla anuncie el título vía aria-labelledby.
 *   5. Scroll lock   — bloquea el scroll del body mientras está abierto.
 *
 * IMPORTANTE (robustez): el efecto depende SOLO de `open`. Los modales suelen
 * pasar `onClose={() => setX(false)}`, una función con identidad nueva en cada
 * render; si estuviera en las dependencias, el efecto se re-ejecutaría en cada
 * tecleo → robaría el foco mientras el usuario escribe y re-aplicaría el scroll
 * lock. Por eso guardamos onClose en un ref que se actualiza cada render y el
 * efecto reacciona únicamente al cambio de `open`.
 *
 * Uso:
 *   const panelRef = useModalA11y<HTMLDivElement>(open, onClose);
 *   ...
 *   <div ref={panelRef} role="dialog" aria-modal="true"
 *        aria-labelledby="mi-titulo" tabIndex={-1}> … </div>
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]), select:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

export function useModalA11y<T extends HTMLElement = HTMLElement>(
  open: boolean,
  onClose: () => void
) {
  const panelRef = useRef<T>(null);

  // onClose siempre actualizado, sin forzar re-run del efecto de abajo.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Lista de elementos enfocables visibles dentro del panel.
    const getFocusable = (): HTMLElement[] => {
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    };

    // Foco inicial en el panel (tabIndex={-1}) → el lector anuncia el diálogo.
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const nodes = getFocusable();
      if (nodes.length === 0) {
        // Sin enfocables: mantener el foco en el panel.
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // Scroll lock del body.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Devolver el foco al trigger si sigue en el DOM.
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return panelRef;
}
