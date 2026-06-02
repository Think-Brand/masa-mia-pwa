"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconCake,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import BottomNav from "./BottomNav";
import { MESES, diasEnMes } from "@/lib/birthday";

/**
 * Empty state de /yo cuando aún no hay cliente válido.
 *
 * Reemplaza el redirect al inicio: el registro vive AQUÍ mismo para
 * ahorrarle clics al usuario. Dos modos:
 *
 *  - Default: copy "Hola, soy Miga. ¿Y tú eres?" + dos botones
 *    (Ver el menú / Ya somos amigos). "Ya somos amigos" cambia a modo
 *    form sin navegar.
 *  - Form: pide nombre + WhatsApp + cumple (opcional). Al guardar,
 *    setCliente y se queda en /yo mostrando el perfil real.
 *
 *  Auto-lookup: si el WhatsApp ya existe en DB, lo reconoce y hidrata.
 */
export default function YoRegistroEmptyState() {
  const router = useRouter();
  const { setCliente } = useCarrito();
  const [mode, setMode] = useState<"intro" | "form">("intro");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [recognized, setRecognized] = useState<string | null>(null);
  const [bdayOpen, setBdayOpen] = useState(false);
  const [bdayMes, setBdayMes] = useState(1);
  const [bdayDia, setBdayDia] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Auto-lookup por WhatsApp (mismo flujo que en RegistroInline)
  useEffect(() => {
    if (mode !== "form") return;
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    if (whatsapp.length !== 10) {
      setRecognized(null);
      return;
    }
    lookupTimer.current = window.setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("id, name")
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
  }, [whatsapp, mode]);

  const maxDia = diasEnMes(bdayMes);
  const diaSeguro = Math.min(bdayDia, maxDia);

  const onConfirmar = async () => {
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

    const cumple =
      !recognized && bdayOpen
        ? `${String(bdayMes).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`
        : null;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("customers")
        .select(
          "id, name, avatar_pose, birthday, birthday_set_at, birthday_greeted_year"
        )
        .eq("whatsapp", cleanWa)
        .maybeSingle();

      let customerId: string;
      let avatarPose = "adorable";
      let birthday: string | null = null;
      let birthday_set_at: string | null = null;
      let birthday_greeted_year: number | null = null;

      if (existing) {
        customerId = existing.id;
        avatarPose = existing.avatar_pose ?? "adorable";
        birthday = existing.birthday ?? null;
        birthday_set_at = existing.birthday_set_at ?? null;
        birthday_greeted_year = existing.birthday_greeted_year ?? null;
      } else {
        const nowIso = new Date().toISOString();
        const payload: Record<string, any> = {
          name: cleanName,
          whatsapp: cleanWa,
        };
        if (cumple) {
          payload.birthday = cumple;
          payload.birthday_set_at = nowIso;
        }
        const { data: nuevo, error: insErr } = await supabase
          .from("customers")
          .insert(payload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (!nuevo?.id) throw new Error("Sin id del cliente nuevo.");
        customerId = nuevo.id;
        if (cumple) {
          birthday = cumple;
          birthday_set_at = nowIso;
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
      // Nos quedamos en /yo — al rehidratarse el contexto, este componente
      // se desmonta y el perfil real aparece.
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Algo se atascó. Intenta otra vez.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-28 bg-crema">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur px-4 py-3 border-b border-caramelo/20">
        <h1
          className="text-2xl text-cafe text-center"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Yo
        </h1>
      </header>

      <div className="flex-1 px-6 pt-8 flex flex-col items-center text-center gap-4">
        <Image
          src="/mascota/miga-tierna.png"
          alt="Miga"
          width={160}
          height={160}
          className="w-40 h-40 object-contain anim-breath"
          priority
        />
        <h2
          className="text-3xl text-cafe leading-tight"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Hola, soy Miga.
          <br />
          ¿Y tú eres?
        </h2>

        {mode === "intro" && (
          <>
            <p className="text-sm text-canela max-w-[260px] leading-relaxed">
              Cuéntanos quién eres y guardamos tus antojos para la próxima.
            </p>

            <div className="w-full flex flex-col gap-2 mt-3">
              <button
                type="button"
                onClick={() => setMode("form")}
                className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
              >
                Ya somos amigos <IconArrowRight size={16} />
              </button>
              <Link
                href="/catalogo"
                className="w-full bg-transparent border border-caramelo/40 text-cafe rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                Volver al menú
              </Link>
            </div>
          </>
        )}

        {mode === "form" && (
          <div className="w-full flex flex-col gap-2.5 fade-up mt-1">
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
              className="w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition text-left"
            />
            <input
              type="text"
              inputMode="text"
              autoComplete="given-name"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!!recognized}
              className={`w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition text-left ${
                recognized ? "bg-crema-soft" : ""
              }`}
            />

            {recognized && (
              <p className="text-[11px] text-verde italic flex items-center justify-center gap-1">
                <IconCheck size={12} />
                ¡Hola otra vez, {recognized}!
              </p>
            )}

            {!recognized && (
              <div className="bg-white border-2 border-dashed border-caramelo/60 rounded-2xl px-3 py-2.5 text-left">
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
                      <div className="text-[11px] text-canela italic leading-tight">
                        Te acreditamos 1 rol gratis ese día
                      </div>
                    </div>
                    <IconChevronDown
                      size={16}
                      className="text-canela flex-shrink-0"
                    />
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
                        onChange={(e) =>
                          setBdayMes(parseInt(e.target.value, 10))
                        }
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
                        onChange={(e) =>
                          setBdayDia(parseInt(e.target.value, 10))
                        }
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
                    <p className="text-[11px] text-canela text-center italic mt-2 leading-tight">
                      Solo día y mes. Sin año. Promesa de Miga 🤎
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-[11px] text-[#C0392B] text-center">{error}</p>
            )}

            <button
              type="button"
              onClick={onConfirmar}
              disabled={
                saving || whatsapp.length !== 10 || name.trim().length < 2
              }
              className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md disabled:opacity-50 mt-1"
            >
              {saving ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Guardar y entrar <IconArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode("intro")}
              className="text-[11px] text-canela underline active:scale-95 mt-1"
            >
              Mejor regreso al menú
            </button>

            <Link
              href="/privacidad"
              className="text-[11px] text-canela/80 text-center mt-1 underline"
            >
              ¿Qué hacemos con tus datos?
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
