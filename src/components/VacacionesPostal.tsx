"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { IconX } from "@tabler/icons-react";
import { getSettings, type Settings } from "@/lib/settings";
import { pickMiga } from "@/lib/migaEmotions";

/**
 * Postal de vacaciones: pop-up que aparece UNA VEZ POR SESIÓN cuando el
 * negocio está en modo vacaciones. Le dice al cliente cuándo volvemos a
 * hornear.
 *
 * Estilo postal: marco con bordes, sello de fecha, imagen de Miga
 * vacacionando y mensaje custom.
 */

const SESSION_KEY = "masamia:vacacionesPostal";

function formatFecha(iso: string): string {
  if (!iso) return "";
  // YYYY-MM-DD → "lunes 15 de junio"
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function VacacionesPostal() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    // ¿Ya saludamos en esta sesión?
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {}

    getSettings().then((s) => {
      if (!s) return;
      if (s.vacation_active === "on" && s.vacation_to) {
        setSettings(s);
        setOpen(true);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {}
      }
    });
  }, []);

  if (!open || !settings) return null;

  const postalImg = pickMiga("vacaciones", Date.now());
  const fechaRegreso = formatFecha(settings.vacation_to);

  return (
    <div
      className="fixed inset-0 z-[80] bg-cafe/75 backdrop-blur-sm flex items-center justify-center px-4 fade-up"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Postal con marco */}
        <div className="bg-crema rounded-2xl shadow-2xl overflow-hidden border-4 border-white">
          {/* Sello esquina superior derecha */}
          <div className="absolute top-3 right-3 z-10 bg-antojo text-white text-[10px] font-bold uppercase tracking-widest rounded-md px-2 py-1 shadow-lg rotate-3">
            🥐 cerrado
          </div>

          {/* Cerrar */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 text-cafe flex items-center justify-center active:scale-90 shadow-md"
          >
            <IconX size={16} />
          </button>

          {/* Imagen */}
          <div className="bg-gradient-to-b from-[#F5E8CE] to-crema pt-7 pb-3 flex items-center justify-center">
            <Image
              src={postalImg}
              alt="Miga en vacaciones"
              width={220}
              height={220}
              className="drop-shadow-md"
              priority
            />
          </div>

          {/* Texto */}
          <div className="px-5 pt-1 pb-5 text-center">
            <p
              className="text-2xl text-cafe leading-tight"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¡Nos fuimos a descansar!
            </p>
            <p className="text-sm text-canela mt-2 leading-relaxed italic">
              {settings.vacation_message ||
                "Estamos descansando un ratito 🥐"}
            </p>

            <div className="mt-4 inline-block bg-white border-2 border-dashed border-canela/40 rounded-xl px-4 py-2">
              <div className="text-[10px] font-bold text-canela uppercase tracking-widest">
                Volvemos a hornear
              </div>
              <div
                className="text-base text-cafe leading-none mt-0.5 capitalize"
                style={{ fontFamily: "ReginaBlack" }}
              >
                {fechaRegreso}
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full bg-cafe text-crema rounded-xl py-2.5 text-sm font-bold active:scale-95 transition"
              style={{ fontFamily: "Termina" }}
            >
              Te aviso entonces 🤎
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
