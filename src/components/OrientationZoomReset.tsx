"use client";

import { useEffect } from "react";

/**
 * Arregla un bug histórico de iOS Safari: al rotar la pantalla, el zoom
 * queda atascado en un valor extremo y no vuelve al normal hasta que el
 * usuario hace double-tap o pinch-to-reset.
 *
 * Solución: al detectar orientationchange, fuerza un re-cálculo del
 * viewport meta tag bajando momentaneamente maximum-scale a 1, y un tick
 * después lo restaura a 5 (manteniendo accesibilidad WCAG).
 *
 * No interfiere con el zoom intencional del usuario (ese sigue funcionando).
 */
export default function OrientationZoomReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reset = () => {
      const meta = document.querySelector(
        'meta[name="viewport"]'
      ) as HTMLMetaElement | null;
      if (!meta) return;

      const original = meta.content;
      // Forzar reset bajando maxScale a 1
      meta.content =
        "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

      // Volver al estado original (permite zoom accesible)
      window.setTimeout(() => {
        meta.content = original;
      }, 350);
    };

    // orientationchange es lo clásico; visualViewport.resize es el equivalente
    // moderno (más confiable en iOS 16+).
    window.addEventListener("orientationchange", reset);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", reset);
    }

    return () => {
      window.removeEventListener("orientationchange", reset);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", reset);
      }
    };
  }, []);

  return null;
}
