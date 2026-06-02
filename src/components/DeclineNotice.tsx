"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "./CarritoProvider";
import { getSettings } from "@/lib/settings";

type DeclinedOrder = {
  id: string;
  folio: string;
  decline_reason: string | null;
  decline_message: string | null;
  pickup_date: string | null;
  contact_person: "alex" | "fabiola" | null;
  total: number;
};

/**
 * Detecta si el cliente tiene pedidos declinados sin haber visto el aviso,
 * y muestra modal con Miga.
 *
 * - Suscribe a realtime: si declinan mientras está conectado, modal aparece al instante.
 * - Solo muestra una vez por pedido (marca customer_acknowledged_decline al cerrar).
 * - Defensa local: guarda en localStorage los folios ya aceptados para que el modal
 *   no rebote aunque falle la escritura a Supabase (RLS, red, etc).
 */

const ACK_STORAGE_KEY = "masamia:decline-acked";

function getLocallyAcked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markLocallyAcked(orderId: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getLocallyAcked();
    set.add(orderId);
    // Limita a últimos 50 para no crecer indefinidamente
    const trimmed = Array.from(set).slice(-50);
    window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function DeclineNotice() {
  const router = useRouter();
  const { cliente } = useCarrito();
  const [pending, setPending] = useState<DeclinedOrder | null>(null);
  const [closing, setClosing] = useState(false);
  const [waContact, setWaContact] = useState<string>("5218110050755");

  // Cargar settings de WhatsApp
  useEffect(() => {
    getSettings().then((s) => {
      if (!s) return;
      // Por defecto Fabiola, pero el contacto correcto se cambia abajo según contact_person
      setWaContact(s.contact_fabiola_wa || "5218110050755");
    });
  }, []);

  // Polling inicial + realtime
  useEffect(() => {
    if (!cliente?.id) return;
    const supabase = createClient();
    const localAcked = getLocallyAcked();

    const fetchPending = async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, folio, decline_reason, decline_message, pickup_date, contact_person, total, customer_acknowledged_decline"
        )
        .eq("customer_id", cliente.id)
        .eq("status", "declined")
        .eq("customer_acknowledged_decline", false)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return;
      // Descarta los que ya están aceptados localmente (defensa contra rebote)
      const firstUnseen = (data as any[]).find(
        (o) => !localAcked.has(o.id)
      );
      if (firstUnseen) setPending(firstUnseen);
    };
    fetchPending();

    // Realtime: avisar al instante si declinan un pedido
    const channel = supabase
      .channel(`decline-${cliente.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${cliente.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          // Solo mostramos si: está declinado, no ha sido reconocido en BD,
          // Y no fue aceptado localmente (cubre el caso de rebote por race condition).
          const acked = getLocallyAcked();
          if (
            updated.status === "declined" &&
            updated.customer_acknowledged_decline === false &&
            !acked.has(updated.id)
          ) {
            setPending(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente?.id]);

  // Cargar contacto correcto según el pedido
  useEffect(() => {
    if (!pending?.contact_person) return;
    getSettings().then((s) => {
      if (!s) return;
      const wa =
        pending.contact_person === "alex"
          ? s.contact_alex_wa
          : s.contact_fabiola_wa;
      if (wa) setWaContact(wa);
    });
  }, [pending?.contact_person]);

  // Marca el aviso como visto en BD. Devuelve Promise para que callers puedan await.
  // Importante: aunque la BD falle, marcamos el folio localmente para que el modal
  // no vuelva a saltar en esta sesión / dispositivo.
  const acknowledge = async (closeAfter = true): Promise<void> => {
    if (!pending) return;
    const orderId = pending.id;
    // 1) Marca local INMEDIATA — defensa contra rebote
    markLocallyAcked(orderId);
    // 2) Cierra el modal optimistamente
    if (closeAfter) setPending(null);
    setClosing(true);
    // 3) Intenta persistir en BD (best effort)
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ customer_acknowledged_decline: true })
      .eq("id", orderId);
    if (error) {
      console.error("acknowledge decline failed", error);
    }
    setClosing(false);
  };

  // Cambiar fecha: marca como visto + navega
  const goRecuperar = async () => {
    if (!pending) return;
    const folio = pending.folio;
    await acknowledge(false);
    setPending(null);
    router.push(`/recuperar/${folio}`);
  };

  if (!pending || !cliente) return null;

  const motivoFinal =
    pending.decline_message || pending.decline_reason || "No fue posible esta vez.";
  const contactName =
    pending.contact_person === "alex" ? "Alex" : "Faby";
  const waMessage = encodeURIComponent(
    `Hola ${contactName}, soy ${cliente.name}. Vi que mi pedido ${pending.folio} no se pudo concretar. ¿Podemos verlo?`
  );

  // WhatsApp: marca como visto + abre WhatsApp
  const goWhatsApp = async () => {
    const url = `https://wa.me/${waContact}?text=${waMessage}`;
    await acknowledge(false);
    setPending(null);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[75] bg-cafe/80 backdrop-blur-md flex items-end sm:items-center justify-center px-4">
      <div className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl fade-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-canela/40 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="text-center">
          <Image
            src="/mascota/miga-sentada.png"
            alt="Miga"
            width={130}
            height={130}
            className="mx-auto"
            priority
          />
          <h2
            className="text-3xl text-cafe leading-none mt-2"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Lo sentimos 🥲
          </h2>
          <p className="text-xs text-canela mt-2 italic">
            Folio <b className="text-cafe">{pending.folio}</b>
          </p>
        </div>

        {/* Motivo */}
        <div className="mt-4 bg-white/80 rounded-2xl p-4 border border-caramelo/30">
          <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
            {contactName} te explica
          </div>
          <p className="text-sm text-cafe mt-1 leading-relaxed">
            {motivoFinal}
          </p>
        </div>

        {/* Opciones */}
        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={goRecuperar}
            disabled={closing}
            className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md disabled:opacity-60"
          >
            <IconCalendarEvent size={18} />
            Cambiar fecha
          </button>
          <button
            onClick={goWhatsApp}
            disabled={closing}
            className="w-full bg-[#25D366] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow disabled:opacity-60"
          >
            <IconBrandWhatsapp size={18} />
            Hablar con {contactName}
          </button>
          <button
            onClick={() => acknowledge(true)}
            disabled={closing}
            className="w-full bg-white border border-caramelo/40 text-cafe rounded-2xl py-2.5 text-xs font-bold active:scale-95 transition mt-1"
          >
            Aceptar
          </button>
        </div>

        <p className="text-[11px] text-canela text-center mt-3 italic max-w-xs mx-auto leading-relaxed">
          Si cambias la fecha, tu antojo se conserva tal cual lo armaste. No
          tienes que volver a escoger nada 🤎
        </p>
      </div>
    </div>
  );
}
