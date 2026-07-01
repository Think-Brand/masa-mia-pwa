"use client";

import Image from "next/image";
import { useState } from "react";
import { IconX, IconCake, IconLock } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import { useModalA11y } from "@/lib/useModalA11y";
import {
  MESES,
  diasEnMes,
  isBirthdayEditable,
  BIRTHDAY_SETTLE_DAYS,
} from "@/lib/birthday";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Modal para agregar/editar el cumpleaños del cliente.
 * Solo guarda mes y día (sin año) para privacidad.
 * Anti-trampa: bloqueado dentro de la ventana del cumple ± 7 días.
 */
export default function CumpleModal({ open, onClose }: Props) {
  const { cliente, setCliente } = useCarrito();

  const editableInfo = isBirthdayEditable(cliente?.birthday);
  const isLocked = !editableInfo.editable;

  // Parsear birthday actual si existe
  const initialMonth = cliente?.birthday
    ? parseInt(cliente.birthday.split("-")[0], 10)
    : new Date().getMonth() + 1;
  const initialDay = cliente?.birthday
    ? parseInt(cliente.birthday.split("-")[1], 10)
    : 1;

  const [mes, setMes] = useState<number>(initialMonth);
  const [dia, setDia] = useState<number>(initialDay);
  const [saving, setSaving] = useState(false);

  const panelRef = useModalA11y<HTMLDivElement>(open, onClose);

  if (!open) return null;

  const maxDia = diasEnMes(mes);
  const diaSeguro = Math.min(dia, maxDia);

  const guardar = async () => {
    if (!cliente?.id || isLocked) return;
    setSaving(true);
    const mm = String(mes).padStart(2, "0");
    const dd = String(diaSeguro).padStart(2, "0");
    const birthday = `${mm}-${dd}`;
    const now = new Date().toISOString();

    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ birthday, birthday_set_at: now })
      .eq("id", cliente.id);

    setCliente({ ...cliente, birthday, birthday_set_at: now });
    setSaving(false);
    onClose();
  };

  const quitar = async () => {
    if (!cliente?.id || isLocked) return;
    setSaving(true);
    const now = new Date().toISOString();
    const supabase = createClient();
    await supabase
      .from("customers")
      .update({ birthday: null, birthday_set_at: now })
      .eq("id", cliente.id);
    setCliente({ ...cliente, birthday: null, birthday_set_at: now });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-cafe/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cumple-titulo"
        tabIndex={-1}
        className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl fade-up max-h-[90vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle móvil */}
        <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex justify-end -mt-2 -mr-2">
          <button
            onClick={onClose}
            className="text-canela p-1 active:scale-90"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="text-center">
          <Image
            src="/mascota/sorprendida.png"
            alt="Miga"
            width={110}
            height={110}
            className="mx-auto"
            priority
          />
          <h2
            id="cumple-titulo"
            className="text-3xl text-cafe leading-none mt-2"
            style={{ fontFamily: "ReginaBlack" }}
          >
            {cliente?.birthday ? "Tu cumple" : "Cuéntanos tu cumple"}
          </h2>
          {!isLocked && (
            <p className="text-xs text-canela mt-3 max-w-xs mx-auto leading-relaxed">
              Solo el día y mes (sin año).
              <br />
              <span className="text-antojo font-bold">
                Ese día, un rol va por la casa 🎂
              </span>
            </p>
          )}
        </div>

        {/* Locked: explicar por qué */}
        {isLocked ? (
          <div className="mt-5 bg-white/80 border-2 border-caramelo/40 rounded-2xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-caramelo/20 rounded-full p-2.5">
                <IconLock size={22} className="text-caramelo" />
              </div>
            </div>
            <div
              className="text-base text-cafe leading-tight"
              style={{ fontFamily: "ReginaBlack" }}
            >
              Tu cumple está cerca
            </div>
            <p className="text-xs text-canela mt-2 leading-relaxed max-w-xs mx-auto">
              No se puede editar ahora para evitar trampas 😉
              <br />
              Podrás cambiarlo desde el{" "}
              <b className="text-cafe">{editableInfo.unlockDate}</b>.
            </p>
            <div className="mt-3 bg-crema-soft rounded-xl px-3 py-2 inline-flex items-center gap-1.5">
              <IconCake size={14} className="text-antojo" />
              <span
                className="text-sm font-bold text-cafe capitalize"
                style={{ fontFamily: "Termina" }}
              >
                {cliente?.birthday &&
                  `${parseInt(cliente.birthday.split("-")[1], 10)} de ${MESES[parseInt(cliente.birthday.split("-")[0], 10) - 1]}`}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Selectores mes / día */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div>
                <label
                  htmlFor="cumple-mes"
                  className="text-[11px] font-bold text-canela uppercase tracking-wider"
                >
                  Mes
                </label>
                <select
                  id="cumple-mes"
                  value={mes}
                  onChange={(e) => setMes(parseInt(e.target.value, 10))}
                  className="mt-1 w-full bg-white border border-caramelo/40 rounded-xl px-3 py-3 text-sm text-cafe focus:outline-none focus:border-cafe capitalize"
                >
                  {MESES.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="cumple-dia"
                  className="text-[11px] font-bold text-canela uppercase tracking-wider"
                >
                  Día
                </label>
                <select
                  id="cumple-dia"
                  value={diaSeguro}
                  onChange={(e) => setDia(parseInt(e.target.value, 10))}
                  className="mt-1 w-full bg-white border border-caramelo/40 rounded-xl px-3 py-3 text-sm text-cafe focus:outline-none focus:border-cafe"
                >
                  {Array.from({ length: maxDia }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 bg-white/80 rounded-2xl px-4 py-3 text-center">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
                Tu día especial
              </div>
              <div
                className="text-2xl text-cafe leading-none mt-1 capitalize"
                style={{ fontFamily: "ReginaBlack" }}
              >
                <IconCake size={20} className="inline -mt-1 mr-1 text-antojo" />
                {diaSeguro} de {MESES[mes - 1]}
              </div>
            </div>

            {/* Anti-trampa info */}
            <div className="mt-3 bg-antojo/5 border border-antojo/20 rounded-xl px-3 py-2 text-[11px] text-canela leading-relaxed">
              <b className="text-antojo">Aviso justo:</b> el rol cortesía aplica
              si tu cumple lleva al menos {BIRTHDAY_SETTLE_DAYS} días registrado
              antes de la fecha. Sin trampitas, todos felices 🤎
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={guardar}
                disabled={saving}
                className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Guardando…" : "Guardar cumpleaños"}
              </button>
              {cliente?.birthday && (
                <button
                  onClick={quitar}
                  disabled={saving}
                  className="text-xs text-canela py-2 underline active:scale-95"
                >
                  Quitar mi cumpleaños
                </button>
              )}
            </div>

            <p className="text-[11px] text-canela text-center mt-3 max-w-xs mx-auto leading-relaxed">
              Solo nuestros cocineros pueden verlo, y solo para mandarte el
              cariño.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
