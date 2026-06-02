"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";

/**
 * Pool de frases protagonistas para el landing público.
 * Una se selecciona al azar en cada montaje. Mantiene la marca fresca y
 * evita que la home se sienta clichada.
 */
const FRASES = [
  "Pide primero. Haz dieta después. ¿O era al revés?",
  "El que te mandó aquí, sí te quiere.",
  "Hola. Sí, también sentimos ese vacío. Se llama falta de rol.",
  "Llegaste al lugar correcto. Tu fuerza de voluntad no.",
  "Bienvenido. Tenemos roles pequeños para problemas grandes. Emocionalmente sí.",
  "Un rol no cambia tu vida. Pero prueba con 4: podría funcionar.",
  "Bienvenido al club de “solo iba a ver”.",
  "Haz tu pedido. Yo distraigo a la culpa.",
  "Pide ahora. Luego vemos cómo justificamos esto.",
  "Dale. Nadie llegó hasta aquí para pedir ensalada.",
  "Tu antojo y yo hablamos. Quiere verte.",
  "Hoy se antoja algo. Y ese algo no es responsabilidad fiscal.",
];

/**
 * Landing pública (Modelo B + redesign):
 *
 *  - Hero con frase protagonista rotativa por carga.
 *  - Logo grande (75px, ~150% del anterior).
 *  - "Ya pedí antes · Encuéntrame" como link discreto arriba a la derecha,
 *    estilo "Iniciar sesión" de marcas modernas.
 *  - Easter egg: long press (2.5s) en Miga → /staff/login. Reemplaza el
 *    triple tap viejo, más oculto, menos accidental.
 *  - Sin CTA explícito de staff en pantalla.
 *  - Si ya hay cliente guardado en localStorage, salta directo al catálogo.
 */
export default function Landing() {
  const router = useRouter();
  const { cliente, setCliente } = useCarrito();
  const [showLookup, setShowLookup] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [recognized, setRecognized] = useState<{
    id: string;
    name: string;
    avatar_pose: string | null;
  } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Frase aleatoria al montar — protagonista del hero
  const fraseProtagonista = useMemo(
    () => FRASES[Math.floor(Math.random() * FRASES.length)],
    []
  );

  // Si ya hay cliente válido, salto al catálogo
  useEffect(() => {
    if (
      cliente?.whatsapp &&
      cliente.whatsapp.length === 10 &&
      cliente.name?.trim()
    ) {
      router.replace("/catalogo");
    }
  }, [cliente, router]);

  // Easter egg: long press 2.5s en Miga → staff
  const pressTimer = useRef<number | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);

  const startLongPress = () => {
    setLongPressActive(true);
    pressTimer.current = window.setTimeout(() => {
      setLongPressActive(false);
      router.push("/staff/login");
    }, 2500);
  };
  const cancelLongPress = () => {
    setLongPressActive(false);
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Auto-lookup dentro del modal "Encuéntrame"
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
          "No te encontramos con ese número. ¿Primera vez? Mejor pasa al menú."
        );
      }
    }, 400);
    return () => {
      if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    };
  }, [whatsapp, showLookup]);

  const continueAsRecognized = async () => {
    if (!recognized) return;
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
    <main className="relative min-h-screen flex flex-col items-center justify-between px-6 pt-5 pb-10 max-w-md mx-auto">
      {/* Logo + acceso "Encuéntrame" arriba a la derecha */}
      <div className="w-full flex items-center justify-between gap-3">
        <Image
          src="/logos/logo-02.png"
          alt="Masa Mía"
          width={110}
          height={110}
          priority
          style={{ width: 110, height: "auto", display: "block" }}
        />

        <button
          type="button"
          onClick={() => setShowLookup(true)}
          className="text-[11px] font-bold text-canela uppercase tracking-wider active:scale-95 transition flex items-center gap-1 px-2 py-1 rounded-lg hover:text-cafe"
          style={{ fontFamily: "Termina" }}
        >
          <IconUser size={13} />
          Ya pedí antes
        </button>
      </div>

      {/* Hero: frase protagonista + Miga acompañando */}
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-2">
        <div
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
          role="presentation"
          aria-label="Miga"
          className={`cursor-pointer select-none transition ${
            longPressActive ? "scale-95 opacity-80" : "scale-100"
          }`}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Miga
            pose="chef"
            animation="breath"
            size={180}
            priority
          />
        </div>

        <h1
          className="text-[28px] sm:text-3xl mt-5 leading-[1.1] text-cafe px-2 max-w-[330px]"
          style={{ fontFamily: "ReginaBlack" }}
        >
          {fraseProtagonista}
        </h1>

        <p className="text-canela text-sm mt-5 italic max-w-[260px] leading-relaxed">
          Vamos directo al menú, te lo mereces…
        </p>
      </div>

      {/* CTAs */}
      <div className="w-full flex flex-col gap-2 fade-up">
        <Link
          href="/catalogo"
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
        >
          Ver el menú <IconArrowRight size={16} />
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
              Pon tu WhatsApp y Miga te reconoce. Si es tu primera vez, mejor
              pasa al menú.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="WhatsApp · 10 dígitos"
              maxLength={10}
              value={whatsapp}
              onChange={(e) =>
                setWhatsapp(e.target.value.replace(/\D/g, ""))
              }
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
