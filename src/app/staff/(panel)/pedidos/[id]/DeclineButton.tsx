"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBrandWhatsapp,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type Motivo = {
  key: string;
  emoji: string;
  label: string;
  hint: string;
  defaultMessage: string;
};

const MOTIVOS: Motivo[] = [
  {
    key: "horno_lleno",
    emoji: "🔥",
    label: "Horno lleno hoy",
    hint: "Por alta demanda",
    defaultMessage:
      "¡Hola! Por alta demanda hoy nuestro horno está saturado. ¿Pedimos tu antojo para otro día?",
  },
  {
    key: "sin_tiempo",
    emoji: "⏰",
    label: "Sin tiempo para esta fecha",
    hint: "Necesitamos más anticipación",
    defaultMessage:
      "¡Hola! Tu pedido es para muy pronto y no alcanzamos a hornearlo a tiempo. ¿Te gustaría mover la fecha?",
  },
  {
    key: "insumo_agotado",
    emoji: "📦",
    label: "Insumo agotado",
    hint: "Falta algún ingrediente",
    defaultMessage:
      "¡Hola! Se nos terminó un ingrediente clave de tu pedido y no podríamos prepararlo como te gusta. ¿Vamos por otra opción?",
  },
];

export function DeclineButton({
  orderId,
  customerName,
  customerWhatsapp,
  folio,
}: {
  orderId: string;
  customerName: string;
  customerWhatsapp?: string | null;
  folio?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const pickMotivo = (m: Motivo) => {
    setMotivo(m);
    setMensaje(m.defaultMessage);
  };

  const onClose = () => {
    if (saving) return;
    setOpen(false);
    setMotivo(null);
    setMensaje("");
  };

  const submit = async () => {
    if (!motivo) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "declined",
        decline_reason: motivo.key,
        decline_message: mensaje.trim() || null,
      })
      .eq("id", orderId);

    if (error) {
      alert("No se pudo declinar: " + error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setDone(true);
    router.refresh();
  };

  const closeAll = () => {
    setOpen(false);
    setMotivo(null);
    setMensaje("");
    setDone(false);
  };

  // Construir link WhatsApp con link a /recuperar
  const buildWaUrl = () => {
    if (!customerWhatsapp || !folio) return null;
    const cleanWa = customerWhatsapp.replace(/\D/g, "");
    const phoneFull = cleanWa.length === 10 ? `521${cleanWa}` : cleanWa;
    const linkRecuperar = `https://masamia.mx/recuperar/${folio}`;
    const baseMsg = mensaje.trim() || motivo?.defaultMessage || "";
    const fullMsg = `${baseMsg}\n\nSi quieres mover la fecha sin volver a armar tu antojo, pícale aquí:\n${linkRecuperar}`;
    return `https://wa.me/${phoneFull}?text=${encodeURIComponent(fullMsg)}`;
  };
  const waUrl = buildWaUrl();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-rojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
      >
        <IconX size={16} /> Declinar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-cafe/70 backdrop-blur-sm flex items-end justify-center"
          onClick={done ? undefined : onClose}
        >
          <div
            className="w-full max-w-md bg-crema rounded-t-3xl pb-6 fade-up max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mt-2 mb-2" />

            {done ? (
              <div className="px-5 pt-2 pb-4 text-center">
                <Image
                  src="/mascota/miga-sentada.png"
                  alt="Miga"
                  width={120}
                  height={120}
                  className="mx-auto"
                />
                <h2
                  className="text-2xl text-cafe leading-none mt-2"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  Pedido declinado
                </h2>
                <p className="text-xs text-canela mt-2 max-w-xs mx-auto leading-relaxed">
                  Ya quedó marcado. Avísale a{" "}
                  <b className="text-cafe">{customerName}</b> con cariño — el
                  link de "cambiar fecha" ya va incluido.
                </p>

                <div className="flex flex-col gap-2 mt-5 px-4">
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeAll}
                      className="w-full bg-[#25D366] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
                    >
                      <IconBrandWhatsapp size={18} />
                      Avisar por WhatsApp
                    </a>
                  ) : (
                    <p className="text-[11px] text-canela italic">
                      Sin WhatsApp del cliente — avísale como prefieras.
                    </p>
                  )}
                  <button
                    onClick={closeAll}
                    className="text-xs text-canela py-2 active:scale-95"
                  >
                    Listo, después le aviso
                  </button>
                </div>

                <p className="text-[11px] text-canela italic mt-3 max-w-xs mx-auto leading-relaxed">
                  Aunque no le mandes WhatsApp, el cliente verá el aviso en la
                  app la próxima vez que la abra.
                </p>
              </div>
            ) : (
              <>

            {/* Encabezado con Miga */}
            <div className="px-5 pt-2 text-center">
              <Image
                src="/mascota/miga-malabares.png"
                alt="Miga malabares"
                width={120}
                height={120}
                className="mx-auto"
                priority
              />
              <h2
                className="text-2xl text-rojo leading-none mt-2"
                style={{ fontFamily: "ReginaBlack" }}
              >
                ¡Estamos saturados!
              </h2>
              <p className="text-xs text-canela mt-2 max-w-xs mx-auto leading-relaxed">
                Elige el motivo y le mandamos mensaje cariñoso a{" "}
                <b className="text-cafe">{customerName}</b>.
              </p>
            </div>

            {/* Motivos */}
            <div className="px-4 mt-4 space-y-2">
              {MOTIVOS.map((m) => {
                const active = motivo?.key === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => pickMotivo(m)}
                    className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 transition ${
                      active
                        ? "bg-rojo text-white shadow-md"
                        : "bg-white text-cafe shadow-sm"
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <div className="flex-1">
                      <div
                        className="text-sm font-bold"
                        style={{ fontFamily: "Termina" }}
                      >
                        {m.label}
                      </div>
                      <div
                        className={`text-[11px] ${
                          active ? "text-white/80" : "text-canela"
                        }`}
                      >
                        {m.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mensaje editable */}
            {motivo && (
              <div className="px-4 mt-4 fade-up">
                <div className="text-[11px] font-bold uppercase tracking-widest text-canela mb-1">
                  Mensaje para {customerName}
                </div>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-caramelo/40 rounded-xl px-3 py-2.5 text-xs text-cafe focus:outline-none focus:border-cafe resize-none"
                />
                <p className="text-[11px] text-canela italic mt-1">
                  Quedará guardado en el pedido. (Notificación al cliente se enviará en una próxima fase.)
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="px-4 mt-4 flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={!motivo || saving}
                className="w-full bg-rojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 shadow-md"
              >
                {saving ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />{" "}
                    Declinando…
                  </>
                ) : (
                  <>Declinar y notificar</>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="w-full bg-transparent text-canela text-xs font-bold py-2"
              >
                Cancelar
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
