"use client";

/**
 * Pull-to-refresh para la PWA en modo standalone (iOS no trae el nativo).
 * Cuando la página está hasta arriba y el usuario jala hacia abajo más
 * allá del umbral, dispara router.refresh() — igual que el botón de
 * recarga del staff.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";

const THRESHOLD = 75; // px de jalón para disparar
const MAX_PULL = 110; // tope visual

export default function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const atTop = () =>
      (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;

    const onTouchStart = (e: TouchEvent) => {
      if (!atTop() || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || !atTop()) {
        if (!pulling.current) startY.current = null;
        if (dy <= 0) setPull(0);
        return;
      }
      pulling.current = true;
      // Resistencia: el indicador avanza a media velocidad
      setPull(Math.min(MAX_PULL, dy * 0.5));
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      const reached = pull >= THRESHOLD;
      startY.current = null;
      pulling.current = false;
      if (reached && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        router.refresh();
        // router.refresh() no devuelve promesa; damos un respiro visual
        window.setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, 900);
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, router]);

  const visible = pull > 4 || refreshing;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        top: 0,
        transform: `translateY(${visible ? pull - 44 : -56}px)`,
        transition: pulling.current ? "none" : "transform 200ms ease",
      }}
    >
      <div
        className={`w-10 h-10 rounded-full bg-cafe text-crema shadow-lg flex items-center justify-center ${
          refreshing ? "" : ""
        }`}
        style={{ opacity: Math.max(progress, refreshing ? 1 : 0) }}
      >
        <IconRefresh
          size={20}
          className={refreshing ? "animate-spin" : ""}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 270}deg)` }
          }
        />
      </div>
    </div>
  );
}
