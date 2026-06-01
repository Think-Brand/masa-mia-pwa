"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconChefHat,
  IconCake,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";
import { MESES, diasEnMes } from "@/lib/birthday";

export default function LeadGate() {
  const router = useRouter();
  const { cliente, setCliente } = useCarrito();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bdayOpen, setBdayOpen] = useState(false);
  const [bdayMes, setBdayMes] = useState<number>(1);
  const [bdayDia, setBdayDia] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Easter egg: 3 toques rápidos a Miga → entrar a staff
  const tapState = useRef<{ count: number; lastTap: number }>({
    count: 0,
    lastTap: 0,
  });
  const tapMiga = () => {
    const now = Date.now();
    // Si pasó más de 900ms desde el último toque, reiniciar
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

  const maxDia = diasEnMes(bdayMes);
  const diaSeguro = Math.min(bdayDia, maxDia);

  // Si ya hay cliente registrado y el WhatsApp tiene 10 dígitos, al catálogo
  useEffect(() => {
    if (cliente?.whatsapp && cliente.whatsapp.length === 10 && cliente.name) {
      router.replace("/catalogo");
    }
  }, [cliente, router]);

  // Auto-reconocer WhatsApp existente
  useEffect(() => {
    if (lookupTimer.current) {
      window.clearTimeout(lookupTimer.current);
    }
    if (whatsapp.length !== 10) {
      setRecognized(null);
      return;
    }
    lookupTimer.current = window.setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("id, name, avatar_pose")
        .eq("whatsapp", whatsapp)
        .maybeSingle();
      if (data) {
        setName(data.name);
        setRecognized(data.name);
      } else {
        setRecognized(null);
      }
    }, 400);
    return () => {
      if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    };
  }, [whatsapp]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanWa = whatsapp.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("Necesito un nombre, aunque sea de cariño.");
      return;
    }
    if (cleanWa.length !== 10) {
      setError("El WhatsApp va a 10 dígitos, sin lada de país.");
      return;
    }

    // Cumpleaños: solo si está abierto Y es cliente nuevo
    const cumpleNuevo =
      !recognized && bdayOpen
        ? `${String(bdayMes).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`
        : null;

    setLoading(true);
    try {
      const supabase = createClient();
      // Buscar si ya existe el cliente
      const { data: existing } = await supabase
        .from("customers")
        .select("id, name, whatsapp")
        .eq("whatsapp", cleanWa)
        .maybeSingle();

      let customerId: string;
      let avatarPose: string | undefined;
      let birthday: string | null = null;
      let birthday_set_at: string | null = null;
      let birthday_greeted_year: number | null = null;
      if (existing) {
        customerId = existing.id;
        // Traer avatar + birthday data guardada
        const { data: full } = await supabase
          .from("customers")
          .select(
            "avatar_pose, birthday, birthday_set_at, birthday_greeted_year"
          )
          .eq("id", customerId)
          .maybeSingle();
        avatarPose = full?.avatar_pose ?? "adorable";
        birthday = full?.birthday ?? null;
        birthday_set_at = full?.birthday_set_at ?? null;
        birthday_greeted_year = full?.birthday_greeted_year ?? null;
      } else {
        const now = new Date().toISOString();
        const insertPayload: Record<string, any> = {
          name: cleanName,
          whatsapp: cleanWa,
        };
        if (cumpleNuevo) {
          insertPayload.birthday = cumpleNuevo;
          insertPayload.birthday_set_at = now;
        }
        const { data: nuevo, error: insErr } = await supabase
          .from("customers")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        customerId = nuevo.id;
        avatarPose = "adorable";
        if (cumpleNuevo) {
          birthday = cumpleNuevo;
          birthday_set_at = now;
        }
      }

      setCliente({
        id: customerId,
        name: cleanName,
        whatsapp: cleanWa,
        avatar_pose: avatarPose,
        birthday,
        birthday_set_at,
        birthday_greeted_year,
      });
      router.push("/catalogo");
    } catch (err: any) {
      console.error(err);
      setError("Algo pasó al guardar. Intenta otra vez.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 pt-6 pb-10 max-w-md mx-auto">
      {/* Logo de marca — primer touchpoint */}
      <div className="w-full flex justify-center">
        <Image
          src="/logos/logo-02.png"
          alt="Masa Mía"
          width={72}
          height={72}
          priority
          style={{
            width: 72,
            height: "auto",
            display: "block",
          }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center pt-4">
        {/* Easter egg: 3 toques rápidos = acceso staff */}
        <div
          onClick={tapMiga}
          role="button"
          tabIndex={-1}
          aria-label="Miga"
          className="cursor-pointer select-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Miga
            pose={recognized ? "lista" : "chef"}
            animation={recognized ? "jump" : "breath"}
            size={210}
            priority
          />
        </div>
        <h1
          className="text-4xl mt-4 leading-none text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          {recognized ? (
            <>
              ¡Hola otra vez,
              <br />
              {recognized}! 🤎
            </>
          ) : (
            <>
              ¿Listos para
              <br />
              el antojo?
            </>
          )}
        </h1>
        <p className="text-canela text-xs mt-4 max-w-[260px] leading-relaxed">
          {recognized ? (
            <>
              Qué bueno verte de vuelta.
              <br />
              <span className="text-caramelo italic">
                Pásale, el menú está listo.
              </span>
            </>
          ) : (
            <>
              Déjanos saber quién eres y te mostramos el menú completo.
              <br />
              <span className="text-caramelo italic">
                Tu antojo está en buenas manos.
              </span>
            </>
          )}
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full flex flex-col gap-3 fade-up">
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
        <input
          type="text"
          inputMode="text"
          autoComplete="given-name"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={!!recognized}
          className={`w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition ${
            recognized ? "bg-crema-soft" : ""
          }`}
        />

        {/* Campo cumpleaños — solo para clientes nuevos */}
        {!recognized && (
          <div className="bg-white border-2 border-dashed border-caramelo/60 rounded-2xl px-3 py-2.5">
            {!bdayOpen ? (
              <button
                type="button"
                onClick={() => setBdayOpen(true)}
                className="w-full flex items-center gap-2 text-left active:scale-[0.99] transition"
              >
                <div className="w-9 h-9 rounded-full bg-antojo/10 flex items-center justify-center text-antojo flex-shrink-0">
                  <IconCake size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[12px] font-bold text-cafe"
                    style={{ fontFamily: "Termina" }}
                  >
                    🎂 Cuéntanos tu cumple
                  </div>
                  <div className="text-[10px] text-caramelo italic leading-tight">
                    Te regalamos 1 rol cuando llegue tu día
                  </div>
                </div>
                <IconChevronDown size={16} className="text-canela flex-shrink-0" />
              </button>
            ) : (
              <div className="fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <IconCake size={16} className="text-antojo" />
                  <span
                    className="text-[11px] font-bold text-cafe flex-1"
                    style={{ fontFamily: "Termina" }}
                  >
                    Cuándo es tu cumple
                  </span>
                  <button
                    type="button"
                    onClick={() => setBdayOpen(false)}
                    className="text-canela active:scale-90"
                    aria-label="Cerrar"
                  >
                    <IconChevronUp size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={bdayMes}
                    onChange={(e) => setBdayMes(parseInt(e.target.value, 10))}
                    className="bg-crema-soft border border-caramelo/40 rounded-xl px-2.5 py-2 text-xs text-cafe focus:outline-none focus:border-cafe capitalize"
                  >
                    {MESES.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={diaSeguro}
                    onChange={(e) => setBdayDia(parseInt(e.target.value, 10))}
                    className="bg-crema-soft border border-caramelo/40 rounded-xl px-2.5 py-2 text-xs text-cafe focus:outline-none focus:border-cafe"
                  >
                    {Array.from({ length: maxDia }, (_, i) => i + 1).map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <p className="text-[9px] text-canela text-center italic mt-2 leading-tight">
                  Solo día y mes. Sin año. Promesa de Miga 🤎
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-[#C0392B] text-center px-2 fade-up">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70 shadow-md"
        >
          {loading ? "Anotando..." : recognized ? (
            <>
              Entrar al menú <IconArrowRight size={16} />
            </>
          ) : (
            <>
              Ver el menú <IconArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-[10px] text-canela text-center mt-1">
          Sin spam. Solo cuando hay algo rico.
        </p>

        {/* Acceso staff discreto */}
        <Link
          href="/staff/login"
          className="mt-4 text-[11px] text-canela text-center flex items-center justify-center gap-1.5 hover:text-cafe transition active:scale-95"
        >
          <IconChefHat size={13} />
          ¿Eres del staff? <span className="font-bold underline">Entrar a la cocina</span>
        </Link>
      </form>
    </main>
  );
}
