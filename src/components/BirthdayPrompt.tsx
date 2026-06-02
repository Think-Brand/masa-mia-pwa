"use client";

import { useState } from "react";
import {
  IconCake,
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import { MESES, diasEnMes } from "@/lib/birthday";

/**
 * Captura opcional de cumpleaños post-compra (Modelo B).
 *
 * Aparece en /confirmacion solo si:
 *   - hay cliente en contexto
 *   - cliente todavía no tiene birthday guardado
 *
 * Si lo guarda: queda en customers.birthday + birthday_set_at, y el cliente
 * recibirá 1 rol gratis cuando llegue ese día (con regla anti-trampa de
 * 7 días + 1 vez al año).
 *
 * Si lo cierra: la tarjeta desaparece de esta confirmación. Volverá a
 * ofrecerse en la siguiente compra hasta que el cliente lo capture o
 * lo defina explícitamente.
 */
export default function BirthdayPrompt() {
  const { cliente, setCliente } = useCarrito();
  const [mes, setMes] = useState<number>(1);
  const [dia, setDia] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!cliente || cliente.birthday || dismissed) return null;

  const maxDia = diasEnMes(mes);
  const diaSeguro = Math.min(dia, maxDia);

  const onGuardar = async () => {
    if (!cliente.id) return;
    const value = `${String(mes).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`;
    setSaving(true);
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("customers")
      .update({ birthday: value, birthday_set_at: nowIso })
      .eq("id", cliente.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      // hidratar context para que la siguiente pantalla lo refleje
      setCliente({
        ...cliente,
        birthday: value,
        birthday_set_at: nowIso,
      });
    }
  };

  if (saved) {
    return (
      <div
        className="mt-4 w-full bg-antojo/10 border border-antojo/30 rounded-2xl p-4 text-left cortesia-pop"
      >
        <div className="flex items-center gap-2">
          <IconCheck size={16} className="text-antojo" />
          <p className="text-sm text-cafe font-bold">
            ¡Anotado en la agenda de Miga! 🎂
          </p>
        </div>
        <p className="text-[11px] text-canela mt-1 leading-snug">
          Te avisamos cuando se acerque, con 1 rol por la casa esperándote.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-4 w-full bg-white rounded-2xl p-4 text-left shadow-sm fade-up border-2 border-dashed border-antojo/40 relative"
      aria-labelledby="bday-prompt-title"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ahora no"
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-crema-soft text-canela flex items-center justify-center active:scale-90 transition"
      >
        <IconX size={14} />
      </button>

      <div className="flex items-center gap-2 mb-1.5 pr-7">
        <div className="w-9 h-9 rounded-full bg-antojo/10 flex items-center justify-center text-antojo flex-shrink-0">
          <IconCake size={18} />
        </div>
        <h3
          id="bday-prompt-title"
          className="text-sm font-bold text-cafe"
          style={{ fontFamily: "Termina" }}
        >
          ¿Cuándo cumples?
        </h3>
      </div>

      <p className="text-[11px] text-canela leading-relaxed mb-3">
        Si nos cuentas, te regalamos <b className="text-cafe">1 rol</b> cuando
        llegue tu día. Solo día y mes — sin año. Promesa de Miga 🤎
      </p>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(parseInt(e.target.value, 10))}
          className="bg-crema-soft border border-caramelo/40 rounded-xl px-2.5 py-2 text-xs text-cafe focus:outline-none focus:border-cafe capitalize"
          aria-label="Mes de cumpleaños"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={diaSeguro}
          onChange={(e) => setDia(parseInt(e.target.value, 10))}
          className="bg-crema-soft border border-caramelo/40 rounded-xl px-2.5 py-2 text-xs text-cafe focus:outline-none focus:border-cafe"
          aria-label="Día de cumpleaños"
        >
          {Array.from({ length: maxDia }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onGuardar}
        disabled={saving}
        className="w-full mt-3 bg-antojo text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-60"
        style={{ fontFamily: "Termina" }}
      >
        {saving ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          "Apuntar mi cumple"
        )}
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="w-full mt-2 text-[11px] text-canela italic active:scale-95 transition"
      >
        Ahora no, gracias
      </button>
    </div>
  );
}
