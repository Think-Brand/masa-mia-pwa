"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconGift, IconBrandWhatsapp, IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import {
  isBirthdayToday,
  isBirthdayWithinDays,
  formatBirthday,
} from "@/lib/birthday";
import { getDayOccupancy, type Category } from "@/lib/capacity";

type Item = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type Addable = {
  id: string;
  name: string;
  category: Category;
  price: number;
};

/**
 * Panel de regalo de cumpleaños — SOLO staff, en el detalle del pedido.
 *
 * El cliente NUNCA ve nada de "gratis": el regalo es una decisión de staff
 * sobre un pedido ya recibido. Dos modos: rebajar un ítem que el cliente ya
 * pidió, o agregar un rol/RollinBox gratis ($0). Candado 1x/año + idempotente
 * los aplica la función `apply_birthday_gift` en la base.
 */
export default function BirthdayGiftPanel({
  orderId,
  status,
  isBirthdayTreat,
  pickupDate,
  customer,
  items,
  addable,
}: {
  orderId: string;
  status: string;
  isBirthdayTreat: boolean;
  pickupDate: string | null;
  customer: {
    name: string;
    whatsapp: string | null;
    birthday: string | null;
    birthday_greeted_year: number | null;
    total_orders: number | null;
  };
  items: Item[];
  addable: Addable[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"discount" | "add">("discount");
  const [discountProductId, setDiscountProductId] = useState<string>(
    items.find((it) => it.unit_price > 0)?.product_id ?? ""
  );
  const [addProductId, setAddProductId] = useState<string>(
    addable[0]?.id ?? ""
  );
  const [capacityWarn, setCapacityWarn] = useState<string | null>(null);
  const [checkingCap, setCheckingCap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const esHoy = isBirthdayToday(customer.birthday);
  const esSemana = isBirthdayWithinDays(customer.birthday, 7);
  const currentYear = new Date().getFullYear();
  const yaRegaladoEsteAnio =
    isBirthdayTreat || customer.birthday_greeted_year === currentYear;

  // El pedido debe estar activo para poder regalar
  const activo = !["cancelled", "declined", "delivered"].includes(status);

  // Ítems que se pueden rebajar (precio > 0)
  const discountables = useMemo(
    () => items.filter((it) => it.unit_price > 0),
    [items]
  );

  // Si no es su semana de cumple, no mostramos nada
  if (!esHoy && !esSemana) return null;

  const previos = customer.total_orders ?? 0;

  // Éxito recién aplicado (antes de que el refresh actualice el distintivo)
  if (done) {
    return (
      <div className="mt-3 bg-antojo/10 border border-antojo/30 rounded-2xl p-3 flex items-center gap-2">
        <IconCheck size={18} className="text-antojo" />
        <div className="text-sm text-cafe">
          <b>¡Cortesía aplicada!</b> Ya puedes mandarle la felicitación.
        </div>
      </div>
    );
  }

  // Ya se regaló este año → lo indica el distintivo del pedido, no duplicamos
  if (yaRegaladoEsteAnio) return null;

  const waMessage = `¡${customer.name}! Estás celebrando y nosotros queremos celebrar contigo 🎂 Este rol va por la casa. ¡Feliz cumpleaños! 🤎`;
  const waUrl = customer.whatsapp
    ? `https://wa.me/521${customer.whatsapp}?text=${encodeURIComponent(waMessage)}`
    : null;

  async function checkCapacityFor(productId: string) {
    if (!pickupDate) {
      setCapacityWarn(null);
      return;
    }
    const prod = addable.find((p) => p.id === productId);
    if (!prod) return;
    setCheckingCap(true);
    setCapacityWarn(null);
    try {
      const supabase = createClient();
      const occ = await getDayOccupancy(supabase, pickupDate);
      const row = occ.rows.find((r) => r.category === prod.category);
      if (row && (row.status === "full" || row.status === "over")) {
        setCapacityWarn(
          `Ese día (${pickupDate}) ya está a tope de ${prod.category}. Si agregas, revisa que la cocina pueda con uno más.`
        );
      }
    } catch {
      /* si falla el chequeo, no bloqueamos */
    } finally {
      setCheckingCap(false);
    }
  }

  const reasonLabel: Record<string, string> = {
    already_gifted: "Este pedido ya tiene cortesía de cumpleaños.",
    already_gifted_this_year:
      "Al cliente ya se le regaló su rol de cumpleaños este año.",
    item_not_in_order: "Ese ítem ya no está en el pedido.",
    product_unavailable: "Ese producto no está disponible.",
    category_not_allowed: "Solo se puede regalar un rol o un RollinBox.",
    no_rol: "El pedido no tiene un rol para rebajar.",
  };

  async function aplicar() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const productId = mode === "discount" ? discountProductId : addProductId;
      if (!productId) {
        setError("Elige un producto.");
        setBusy(false);
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc("apply_birthday_gift", {
        p_order_id: orderId,
        p_mode: mode,
        p_product_id: productId,
      });
      if (rpcErr) throw rpcErr;
      const res = data as { success: boolean; reason?: string };
      if (!res?.success) {
        setError(reasonLabel[res?.reason ?? ""] ?? "No se pudo aplicar el regalo.");
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Algo falló al aplicar el regalo. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 bg-white border-2 border-antojo/30 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🎂</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-cafe" style={{ fontFamily: "Termina" }}>
            {esHoy ? "Cumple hoy" : "Cumple esta semana"}
            {" · "}
            {previos} {previos === 1 ? "pedido previo" : "pedidos previos"}
          </div>
          <div className="text-[11px] text-canela">
            {formatBirthday(customer.birthday)}
          </div>
        </div>
      </div>

      {!activo ? (
        <p className="text-[11px] text-canela mt-1">
          Este pedido no está activo, no se puede aplicar la cortesía.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-canela mb-3">
            El cliente no ve esto. Tú decides si le regalas algo de su pedido o le
            agregas un extra gratis.
          </p>

          {/* Selector de modo */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setMode("discount");
                setError(null);
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold border-2 transition ${
                mode === "discount"
                  ? "bg-antojo text-white border-antojo"
                  : "bg-white text-cafe border-caramelo/30"
              }`}
            >
              Rebajar un ítem
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("add");
                setError(null);
                if (addProductId) checkCapacityFor(addProductId);
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold border-2 transition ${
                mode === "add"
                  ? "bg-antojo text-white border-antojo"
                  : "bg-white text-cafe border-caramelo/30"
              }`}
            >
              Agregar gratis
            </button>
          </div>

          {mode === "discount" ? (
            discountables.length === 0 ? (
              <p className="text-[11px] text-canela mb-2">
                Este pedido no tiene ítems con precio para rebajar.
              </p>
            ) : (
              <select
                value={discountProductId}
                onChange={(e) => setDiscountProductId(e.target.value)}
                className="w-full rounded-xl border-2 border-caramelo/30 px-3 py-2 text-sm text-cafe mb-3 bg-white"
              >
                {discountables.map((it) => (
                  <option key={it.product_id} value={it.product_id}>
                    {it.product_name.split(" [")[0]} — ${it.unit_price.toFixed(0)}
                  </option>
                ))}
              </select>
            )
          ) : addable.length === 0 ? (
            <p className="text-[11px] text-canela mb-2">
              No hay roles ni RollinBox disponibles para agregar.
            </p>
          ) : (
            <>
              <select
                value={addProductId}
                onChange={(e) => {
                  setAddProductId(e.target.value);
                  checkCapacityFor(e.target.value);
                }}
                className="w-full rounded-xl border-2 border-caramelo/30 px-3 py-2 text-sm text-cafe mb-2 bg-white"
              >
                {addable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — gratis ({p.category})
                  </option>
                ))}
              </select>
              {checkingCap && (
                <p className="text-[11px] text-canela mb-2">Revisando cupo…</p>
              )}
              {capacityWarn && (
                <div className="flex items-start gap-1.5 text-[11px] text-rojo mb-2">
                  <IconAlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{capacityWarn}</span>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-[11px] text-rojo mb-2 font-bold">{error}</p>
          )}

          <button
            type="button"
            onClick={aplicar}
            disabled={
              busy ||
              (mode === "discount" && !discountProductId) ||
              (mode === "add" && !addProductId)
            }
            className="w-full bg-antojo text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
          >
            <IconGift size={16} />
            {busy
              ? "Aplicando…"
              : mode === "discount"
                ? "Regalar (rebajar del pedido)"
                : "Agregar gratis al pedido"}
          </button>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <IconBrandWhatsapp size={16} />
              Mandar felicitación
            </a>
          )}
        </>
      )}
    </div>
  );
}
