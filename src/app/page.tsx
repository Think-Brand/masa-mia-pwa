"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconChefHat,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";

/**
 * Landing pública (Modelo B): hero sin barrera.
 *
 *  - CTA primario: "Ver el menú" → /catalogo (sin pedir nada).
 *  - CTA secundario: "Ya pedí antes" → abre modal de auto-reconocer con WA.
 *  - Easter egg: 3 toques rápidos a Miga → /staff/login.
 *
 *  Si ya hay cliente guardado en localStorage, salta directo al catálogo.
 *  Captura de datos pasó al carrito; cumpleaños es opcional post-compra.
 */
export default function Landing() {
  const router = useRouter();
  const { cliente, setCliente } = useCarrito();
  const [showLookup, setShowLookup] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [recognized, setRecognized] = useState<{ id: string; name: string; avatar_pose: string | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Si ya hay cliente, al catálogo directo
  useEffect(() => {
    if (cliente?.whatsapp && cliente.whatsapp.length === 10 && cliente.name) {
      router.replace("/catalogo");
    }
  }, [cliente, router]);

  // Easter egg: 3 toques rápidos a Miga → staff
  const tapState = useRef<{ count: number; lastTap: number }>({
    count: 0,
    lastTap: 0,
  });
  const tapMiga = () => {
    const now = Date.now();
    if (now - tapState.current.lastTap > 900) {
      tapState.current.count = 1;
    } else {
      tapState.current.count += 1;
    }
    tapState.current.lastTap = now;
    if (tapState.current.count >= 3) {
      tapState.current.count = 0;
      router.push("/staff/login");
    }
  };

  // Auto-lookup dentro del modal
  useEffect(() => {
    if (!showLookup) return;
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    if (whatsapp.length !== 10) {
      setRecognized(null);
      setLookupError(null);
      return;
    }
    setLookingUp(true);
    lookupTimer.current = window.setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("id, name, avatar_pose")
        .eq("whatsapp", whatsapp)
        .maybeSingle();
      setLookingUp(false);
      if (data) {
        setRecognized(data);
        setLookupError(null);
      } else {
        setRecognized(null);
        setLookupError(
          "No te encontramos con ese número. ¿Es tu primera vez? Mejor pasa al menú."
        );
      }
    }, 400);
    return () => {
      if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    };
  }, [whatsapp, showLookup]);

  const continueAsRecognized = async () => {
    if (!recognized) return;
    // Traer datos completos para hidratar el contexto
    const supabase = createClient();
    const { data: full } = await supabase
      .from("customers")
      .select(
        "avatar_pose, birthday, birthday_set_at, birthday_greeted_year"
      )
      .eq("id", recognized.id)
      .maybeSingle();

    setCliente({
      id: recognized.id,
      name: recognized.name,
      whatsapp,
      avatar_pose: full?.avatar_pose ?? "adorable",
      birthday: full?.birthday ?? null,
      birthday_set_at: full?.birthday_set_at ?? null,
      birthday_greeted_year: full?.birthday_greeted_year ?? null,
    });
    router.push("/catalogo");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 pt-6 pb-10 max-w-md mx-auto">
      {/* Logo */}
      <div className="w-full flex justify-center">
        <Image
          src="/logos/logo-02.png"
          alt="Masa Mía"
          width={72}
          height={72}
          priority
          style={{ width: 72, height: "auto", display: "block" }}
        />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-4">
        <div
          onClick={tapMiga}
          role="button"
          tabIndex={-1}
          aria-label="Miga"
          className="cursor-pointer select-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Miga pose="chef" animation="breath" size={210} priority />
        </div>

        <h1
          className="text-4xl mt-4 leading-none text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Hornado fresco,
          <br />
          hecho con cariño.
        </h1>

        <p className="text-canela text-xs mt-4 max-w-[280px] leading-relaxed">
          Roles, berlinesas y antojos artesanales.
          <br />
          <span className="text-canela italic">
            Mira el menú y pídete lo tuyo.
          </span>
        </p>
      </div>

      {/* CTAs */}
      <div className="w-full flex flex-col gap-3 fade-up">
        <Link
          href="/catalogo"
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
        >
          Ver el menú <IconArrowRight size={16} />
        </Link>

        <button
          type="button"
          onClick={() => setShowLookup(true)}
          className="w-full bg-transparent text-canela text-xs font-bold flex items-center justify-center gap-1.5 py-2 active:scale-95 transition hover:text-cafe"
        >
          <IconUser size={13} />
          Ya pedí antes <span className="underline">Encuéntrame</span>
        </button>

        {/* Acceso staff discreto */}
        <Link
          href="/staff/login"
          className="mt-1 text-[11px] text-canela text-center flex items-center justify-center gap-1.5 hover:text-cafe transition active:scale-95"
        >
          <IconChefHat size={13} />
          ¿Eres del staff? <span className="font-bold underline">Entrar a la cocina</span>
        </Link>

        <Link
          href="/privacidad"
          className="text-[11px] text-canela/80 text-center mt-2 underline"
        >
          Aviso de privacidad
        </Link>
      </div>

      {/* Modal de lookup */}
      {showLookup && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLookup(false)}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-5 pb-8 modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-2xl text-cafe leading-none"
                style={{ fontFamily: "ReginaBlack" }}
              >
                Encuéntrame
              </h2>
              <button
                type="button"
                onClick={() => setShowLookup(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-white text-cafe flex items-center justify-center active:scale-90 transition shadow-sm"
              >
                <IconX size={16} />
              </button>
            </div>
            <p className="text-xs text-canela mb-4">
              Pon tu WhatsApp y Miga te reconoce. Si es tu primera vez, mejor pasa al menú.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="WhatsApp · 10 dígitos"
              maxLength={10}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition"
            />

            {lookingUp && (
              <p className="text-[11px] text-canela italic mt-2 text-center">
                Buscando…
              </p>
            )}

            {recognized && (
              <div className="mt-3 bg-white rounded-2xl p-3 fade-up flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-crema-soft flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Image
                    src={
                      recognized.avatar_pose
                        ? `/mascota/miga-${recognized.avatar_pose}.png`
                        : "/mascota/miga-adorable.png"
                    }
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-base font-bold text-cafe truncate"
                    style={{ fontFamily: "Termina" }}
                  >
                    ¡Hola, {recognized.name}! 🤎
                  </div>
                  <div className="text-[11px] text-canela italic">
                    Qué bueno verte de vuelta.
                  </div>
                </div>
              </div>
            )}

            {lookupError && !recognized && (
              <p className="text-[11px] text-[#C0392B] mt-2 text-center fade-up">
                {lookupError}
              </p>
            )}

            {recognized ? (
              <button
                type="button"
                onClick={continueAsRecognized}
                className="w-full mt-4 bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
              >
                Entrar al menú <IconArrowRight size={16} />
              </button>
            ) : (
              <Link
                href="/catalogo"
                onClick={() => setShowLookup(false)}
                className="w-full mt-4 bg-cafe text-crema rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                Mejor mira el menú <IconArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
