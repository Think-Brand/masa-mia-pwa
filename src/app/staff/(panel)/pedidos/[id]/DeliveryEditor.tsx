"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCalendar, IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { formatPickupTimeLabel } from "@/lib/delivery";

/**
 * Editor de fecha y hora de entrega — SOLO staff.
 *
 * Vive en el detalle del pedido (ruta /staff). Permite ajustar pickup_date y
 * pickup_time cuando se acuerda un cambio con el cliente, para que cocina
 * tenga la agenda en orden. El cliente no tiene acceso a esta pantalla.
 */
export default function DeliveryEditor({
  orderId,
  pickupDate,
  pickupTime,
}: {
  orderId: string;
  pickupDate: string | null; // 'YYYY-MM-DD'
  pickupTime: string | null; // 'HH:MM'
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(pickupDate ?? "");
  const [time, setTime] = useState((pickupTime ?? "").slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayDate = pickupDate
    ? new Date(pickupDate + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;
  const displayTime = pickupTime ? formatPickupTimeLabel(pickupTime) : null;

  const guardar = async () => {
    if (!date) {
      setError("Pon una fecha.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("orders")
      .update({
        pickup_date: date,
        pickup_time: time || null,
      })
      .eq("id", orderId);
    if (err) {
      setError("No se pudo guardar: " + err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const cancelar = () => {
    setDate(pickupDate ?? "");
    setTime((pickupTime ?? "").slice(0, 5));
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div>
          📅 Recoger:{" "}
          {displayDate ? (
            <b className="capitalize">
              {displayDate}
              {displayTime ? ` · ${displayTime}` : ""}
            </b>
          ) : (
            <span className="text-canela italic">sin fecha</span>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-[11px] font-bold text-antojo bg-antojo/10 rounded-full px-2.5 py-1 active:scale-95 transition flex-shrink-0"
        >
          <IconPencil size={13} /> Editar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-crema-soft rounded-xl p-3 border border-caramelo/40">
      <div className="text-[11px] font-bold uppercase tracking-wider text-canela mb-2 flex items-center gap-1.5">
        <IconCalendar size={14} /> Ajustar entrega
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="text-[11px] text-canela block mb-1">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-0 bg-white border border-caramelo/40 rounded-lg px-2.5 py-2 text-sm text-cafe focus:outline-none focus:border-cafe"
          />
        </div>
        <div className="min-w-0">
          <label className="text-[11px] text-canela block mb-1">Hora</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full min-w-0 bg-white border border-caramelo/40 rounded-lg px-2.5 py-2 text-sm text-cafe focus:outline-none focus:border-cafe"
          />
        </div>
      </div>
      {error && <div className="text-[11px] text-rojo mt-2">{error}</div>}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={cancelar}
          disabled={saving}
          className="bg-white border border-caramelo/40 text-cafe rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-60"
        >
          <IconX size={14} /> Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="bg-verde text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-60"
        >
          <IconCheck size={14} /> {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
