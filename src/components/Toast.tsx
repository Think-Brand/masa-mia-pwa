"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { IconCheck } from "@tabler/icons-react";

export type ToastItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  duration?: number;
};

type ToastCtx = {
  show: (toast: Omit<ToastItem, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = {
        id,
        duration: 2200,
        ...toast,
      };
      setToasts((curr) => {
        // Mantener solo 1 toast visible (reemplazar el anterior)
        if (curr.length > 0) {
          for (const t of curr) {
            const timer = timers.current.get(t.id);
            if (timer) {
              window.clearTimeout(timer);
              timers.current.delete(t.id);
            }
          }
          return [item];
        }
        return [...curr, item];
      });
      const timer = window.setTimeout(() => remove(id), item.duration);
      timers.current.set(id, timer);

      // Haptic feedback (si está disponible)
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(20);
        }
      } catch {}
    },
    [remove]
  );

  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) window.clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {/* Container — fixed bottom, encima del bottom nav */}
      <div className="fixed bottom-24 left-0 right-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto w-full max-w-sm bg-cafe text-crema rounded-2xl shadow-2xl flex items-center gap-3 px-3 py-2.5 toast-slide-up"
            style={{ animation: "toastSlideUp 260ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-crema flex-shrink-0 flex items-center justify-center relative">
              {t.imageUrl ? (
                <Image
                  src={t.imageUrl}
                  alt={t.title}
                  width={88}
                  height={88}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🥐</span>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-verde rounded-full flex items-center justify-center shadow">
                <IconCheck size={12} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-bold leading-tight"
                style={{ fontFamily: "Termina" }}
              >
                {t.title}
              </div>
              {t.subtitle && (
                <div className="text-[11px] text-caramelo leading-tight mt-0.5">
                  {t.subtitle}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toastSlideUp {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
