"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Splash de marca: logo circular sobre fondo café.
 * Solo se muestra una vez por sesión del navegador (sessionStorage).
 * Duración total 1.4s: fade-in 300ms, hold 700ms, fade-out 400ms.
 */
export default function Splash() {
  const [stage, setStage] = useState<"idle" | "in" | "hold" | "out" | "done">(
    "idle"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("masamia.splash");
    if (seen === "1") {
      setStage("done");
      return;
    }
    sessionStorage.setItem("masamia.splash", "1");

    setStage("in");
    const t1 = window.setTimeout(() => setStage("hold"), 300);
    const t2 = window.setTimeout(() => setStage("out"), 300 + 700);
    const t3 = window.setTimeout(() => setStage("done"), 300 + 700 + 400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  if (stage === "idle" || stage === "done") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--cafe)",
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
        {/* Logo circular oficial — logo-02.png en /public/logos */}
        <Image
          src="/logos/logo-02.png"
          alt="Masa Mía"
          width={240}
          height={240}
          priority
          style={{
            width: 240,
            height: "auto",
            display: "block",
            filter: "drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25))",
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
            transform: scale(1.03);
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
