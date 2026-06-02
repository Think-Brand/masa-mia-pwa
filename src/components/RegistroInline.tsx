"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconUser, IconCheck } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";

/**
 * Captura inline de datos del cliente dentro del carrito (Modelo B).
 *
 * Aparece solo si no hay cliente en el contexto. Una vez que el usuario
 * llena WhatsApp y nombre, se crea o se busca el cliente y se setea en
 * el contexto. Después de eso este componente deja de renderizarse y
 * el botón "Confirmar pedido" se activa.
 *
 * El cumpleaños NO se pide aquí — se ofrece como opcional después de la
 * confirmación, en la pantalla de éxito (`/confirmacion/[folio]`).
 */
export default function RegistroInline() {
  const { setCliente } = useCarrito();
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [recognized, setRecognized] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Auto-lookup mientras teclea WhatsApp
  useEffect(() => {
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
  }, [whatsapp]);

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
        const { data: nuevo, error: insErr } = await supabase
          .from("customers")
          .insert({ name: cleanName, whatsapp: cleanWa })
          .select("id")
          .single();
        if (insErr) throw insErr;
        customerId = nuevo.id;
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
    } catch (err) {
      console.error(err);
      setError("Algo se atascó. Inténtalo otra vez.");
      setSaving(false);
    }
  };

  return (
    <section
      className="bg-white border-2 border-dashed border-antojo/40 rounded-2xl p-3 fade-up"
      aria-labelledby="registro-inline-titulo"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-full bg-antojo/10 flex items-center justify-center text-antojo">
          <IconUser size={16} />
        </div>
        <h2
          id="registro-inline-titulo"
          className="text-sm font-bold text-cafe"
          style={{ fontFamily: "Termina" }}
        >
          Antes de confirmar
        </h2>
      </div>
      <p className="text-[11px] text-canela leading-relaxed mb-2.5">
        Solo necesitamos tu nombre y WhatsApp para avisarte cuando esté
        listo. Nada más.
      </p>

      <div className="flex flex-col gap-2">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="WhatsApp · 10 dígitos"
          maxLength={10}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
          className="w-full bg-crema-soft border border-caramelo/60 rounded-xl px-3 py-2.5 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition"
        />
        <input
          type="text"
          inputMode="text"
          autoComplete="given-name"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={!!recognized}
          className={`w-full bg-crema-soft border border-caramelo/60 rounded-xl px-3 py-2.5 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition ${
            recognized ? "bg-crema-soft" : ""
          }`}
        />

        {recognized && (
          <p className="text-[11px] text-verde italic fade-up flex items-center gap-1">
            <IconCheck size={12} />
            ¡Hola otra vez, {recognized}!
          </p>
        )}

        {error && (
          <p className="text-[11px] text-[#C0392B] fade-up">{error}</p>
        )}

        <button
          type="button"
          onClick={onConfirmar}
          disabled={saving || whatsapp.length !== 10 || name.trim().length < 2}
          className="w-full bg-cafe text-crema rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50 mt-1"
          style={{ fontFamily: "Termina" }}
        >
          {saving ? "Guardando…" : recognized ? "Continuar con mi cuenta" : "Guardar y continuar"}
        </button>

        <Link
          href="/privacidad"
          className="text-[11px] text-canela/80 text-center mt-1 underline"
        >
          ¿Qué hacemos con tus datos?
        </Link>
      </div>
    </section>
  );
}
