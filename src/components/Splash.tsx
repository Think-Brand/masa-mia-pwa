"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Splash de marca: logo circular grande con fade in/out.
 * Solo se muestra una vez por sesión del navegador (sessionStorage).
 * Duración total ~1.6s: fade-in 300ms, hold 900ms, fade-out 400ms.
 */
export default function Splash() {
  const [stage, setStage] = useState<"idle" | "in" | "hold" | "out" | "done">(
    "idle"
  );

  useEffect(() => {
    // Solo arrancar si nunca se ha mostrado en esta sesión
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("masamia.splash");
    if (seen === "1") {
      setStage("done");
      return;
    }
    sessionStorage.setItem("masamia.splash", "1");

    setStage("in");
    const t1 = window.setTimeout(() => setStage("hold"), 300);
    const t2 = window.setTimeout(() => setStage("out"), 300 + 900);
    const t3 = window.setTimeout(() => setStage("done"), 300 + 900 + 400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  if (stage === "idle" || stage === "done") return null;

  const opacity = stage === "in" ? 0 : stage === "out" ? 0 : 1;
  // Cuando es "in", arranca en 0 y se le aplica transition para llegar a 1.
  // Truco: forzamos a 1 después del primer paint vía CSS animation.

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--crema)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: stage === "out" ? 0 : 1,
        transition: "opacity 400ms ease-out",
      }}
    >
      <div
        style={{
          animation:
            stage === "in" || stage === "hold"
              ? "splash-in 600ms cubic-bezier(0.16, 1, 0.3, 1) both"
              : undefined,
        }}
      >
        <Image
          src="/icons/icon-512.png"
          alt="Masa Mía"
          width={220}
          height={220}
          priority
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            display: "block",
            filter: "drop-shadow(0 8px 24px rgba(58, 39, 29, 0.18))",
          }}
        />
      </div>
      <style jsx>{`
        @keyframes splash-in {
          0% {
            opacity: 0;
            transform: scale(0.88);
          }
          60% {
            opacity: 1;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
