"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconFlame,
  IconPackage,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type Tone = "verde" | "rojo" | "antojo" | "cafe";
type IconKey = "check" | "x" | "flame" | "package";

const TONE_CLASS: Record<Tone, string> = {
  verde: "bg-verde",
  rojo: "bg-rojo",
  antojo: "bg-antojo",
  cafe: "bg-cafe",
};

const ICONS: Record<IconKey, typeof IconCheck> = {
  check: IconCheck,
  x: IconX,
  flame: IconFlame,
  package: IconPackage,
};

export function ChangeStatusButton({
  orderId,
  newStatus,
  label,
  tone,
  icon,
}: {
  orderId: string;
  newStatus: string;
  label: string;
  tone: Tone;
  icon: IconKey;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const Icon = ICONS[icon];

  const click = async () => {
    if (newStatus === "declined") {
      if (!confirm("¿Seguro que quieres declinar este pedido?")) return;
    }
    setLoading(true);
    const supabase = createClient();
    const update: Record<string, any> = { status: newStatus };
    if (newStatus === "accepted") update.accepted_at = new Date().toISOString();
    if (newStatus === "baking")
      update.baking_started_at = new Date().toISOString();
    if (newStatus === "ready") update.ready_at = new Date().toISOString();
    if (newStatus === "delivered")
      update.delivered_at = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId);

    if (error) {
      alert("No se pudo actualizar: " + error.message);
      setLoading(false);
      return;
    }
    router.refresh();
  };

  return (
    <button
      onClick={click}
      disabled={loading}
      className={`w-full ${TONE_CLASS[tone]} text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-md`}
    >
      <Icon size={16} />
      {loading ? "Actualizando…" : label}
    </button>
  );
}
