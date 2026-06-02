"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconLoader2, IconNotes } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

const MONTHS = [
  { v: "01", n: "enero" },
  { v: "02", n: "febrero" },
  { v: "03", n: "marzo" },
  { v: "04", n: "abril" },
  { v: "05", n: "mayo" },
  { v: "06", n: "junio" },
  { v: "07", n: "julio" },
  { v: "08", n: "agosto" },
  { v: "09", n: "septiembre" },
  { v: "10", n: "octubre" },
  { v: "11", n: "noviembre" },
  { v: "12", n: "diciembre" },
];

export default function ClienteEditor({
  clienteId,
  notesInicial,
  birthdayInicial,
  avatarPoseInicial,
}: {
  clienteId: string;
  notesInicial: string;
  birthdayInicial: string;
  avatarPoseInicial: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(notesInicial);
  const [birthday, setBirthday] = useState(birthdayInicial);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);
  const [savedBirthday, setSavedBirthday] = useState(false);

  const [bMonth, setBMonth] = useState(birthday.split("-")[0] ?? "");
  const [bDay, setBDay] = useState(birthday.split("-")[1] ?? "");

  const saveNotes = async () => {
    setSavingNotes(true);
    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ notes: notes.trim() || null })
      .eq("id", clienteId);
    setSavingNotes(false);
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
    router.refresh();
  };

  const saveBirthday = async () => {
    if (!bMonth || !bDay) return;
    const m = bMonth.padStart(2, "0");
    const d = bDay.padStart(2, "0");
    const value = `${m}-${d}`;
    setSavingBirthday(true);
    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ birthday: value, birthday_set_at: new Date().toISOString() })
      .eq("id", clienteId);
    setBirthday(value);
    setSavingBirthday(false);
    setSavedBirthday(true);
    setTimeout(() => setSavedBirthday(false), 2000);
    router.refresh();
  };

  return (
    <section className="mt-4 flex flex-col gap-3">
      {/* Notas */}
      <div className="bg-white rounded-2xl p-3 shadow-sm">
        <label className="text-[11px] font-bold uppercase tracking-wider text-canela flex items-center gap-1">
          <IconNotes size={12} /> Notas internas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: le gusta sin glaseado, siempre llega tarde, alérgica a nueces…"
          rows={2}
          className="w-full mt-1.5 text-sm bg-crema-soft rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-antojo/30"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes || notes === notesInicial}
          className="mt-2 w-full bg-cafe text-crema rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50"
          style={{ fontFamily: "Termina" }}
        >
          {savingNotes ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : savedNotes ? (
            <>
              <IconCheck size={14} /> Guardado
            </>
          ) : (
            "Guardar notas"
          )}
        </button>
      </div>

      {/* Cumpleaños */}
      <div className="bg-white rounded-2xl p-3 shadow-sm">
        <label className="text-[11px] font-bold uppercase tracking-wider text-canela">
          🎂 Cumpleaños
        </label>
        <div className="mt-1.5 flex gap-2">
          <select
            value={bMonth}
            onChange={(e) => setBMonth(e.target.value)}
            className="flex-1 bg-crema-soft rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
          >
            <option value="">Mes</option>
            {MONTHS.map((m) => (
              <option key={m.v} value={m.v}>
                {m.n}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={31}
            value={bDay}
            onChange={(e) => setBDay(e.target.value)}
            placeholder="Día"
            className="w-20 bg-crema-soft rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
          />
        </div>
        <button
          onClick={saveBirthday}
          disabled={
            savingBirthday ||
            !bMonth ||
            !bDay ||
            `${bMonth.padStart(2, "0")}-${bDay.padStart(2, "0")}` === birthday
          }
          className="mt-2 w-full bg-cafe text-crema rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50"
          style={{ fontFamily: "Termina" }}
        >
          {savingBirthday ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : savedBirthday ? (
            <>
              <IconCheck size={14} /> Guardado
            </>
          ) : (
            "Guardar cumpleaños"
          )}
        </button>
      </div>
    </section>
  );
}
