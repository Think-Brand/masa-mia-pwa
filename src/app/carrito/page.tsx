"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconMinus,
  IconPlus,
  IconCash,
  IconBuildingBank,
  IconCopy,
  IconCheck,
  IconCircleCheck,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";

const BENEFICIARIO = "Fabiola Castillo";

export default function Carrito() {
  const router = useRouter();
  const { items, cliente, total, setQty, clear } = useCarrito();
  const [pago, setPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [notas, setNotas] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) router.replace("/");
  }, [cliente, router]);

  if (!cliente) return null;

  const copiarCuenta = async () => {
    try {
      await navigator.clipboard.writeText(CUENTA_BBVA.replace(/\s/g, ""));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const confirmarPedido = async () => {
    if (items.length === 0 || !cliente) return;
    setEnviando(true);
    try {
      const supabase = createClient();

      // 1. Crear el pedido (RLS permite a anon)
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: cliente.id,
          status: "pending",
          total,
          payment_method: pago,
          notes: notas || null,
          source: "pwa",
        })
        .select("id, folio")
        .single();

      if (orderErr) throw orderErr;

      // 2. Crear los items del pedido
      const orderItems = items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        product_name: it.name,
        quantity: it.quantity,
        unit_price: it.price,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Limpiar carrito y redirigir a pantalla de éxito
      clear();
      router.push(`/confirmacion/${order.folio}?pago=${pago}`);
    } catch (err) {
      console.error(err);
      alert("Algo se atascó. Intenta de nuevo o avísanos por WhatsApp.");
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center justify-between px-4 py-3">
        <Link href="/catalogo" aria-label="Atrás" className="text-cafe">
          <IconArrowLeft size={20} />
        </Link>
        <h1
          className="text-2xl text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Mi antojo
        </h1>
        <div className="w-5" />
      </header>

      <div className="flex-1 px-4 flex flex-col gap-3">
        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-4">
            <Miga pose="sentada" animation="sway" size={130} />
            <p className="text-canela text-sm">
              Tu antojo está vacío. <br />
              <span className="text-caramelo">Pasa al menú y ten ojo.</span>
            </p>
            <Link
              href="/catalogo"
              className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition"
            >
              Ver el menú
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Items */}
            <ul className="flex flex-col gap-2">
              {items.map((it) => (
                <li
                  key={it.productId}
                  className="bg-white rounded-xl p-2.5 flex items-center gap-3 fade-up"
                >
                  {it.image_url && (
                    <Image
                      src={it.image_url}
                      alt={it.name}
                      width={56}
                      height={56}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold text-cafe"
                      style={{ fontFamily: "Termina" }}
                    >
                      {it.name}
                    </div>
                    <div className="text-[11px] text-canela">
                      {it.quantity} × ${it.price.toFixed(0)} = $
                      {(it.quantity * it.price).toFixed(0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-crema rounded-lg px-1.5 py-1">
                    <button
                      onClick={() => setQty(it.productId, it.quantity - 1)}
                      aria-label="Quitar uno"
                      className="text-canela active:scale-90 transition"
                    >
                      <IconMinus size={14} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => setQty(it.productId, it.quantity + 1)}
                      aria-label="Agregar uno"
                      className="text-canela active:scale-90 transition"
                    >
                      <IconPlus size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Notas */}
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="📝 Notas (sin nuez, fecha de entrega, etc.)"
              rows={2}
              className="w-full bg-white border border-caramelo/50 rounded-xl px-3 py-2 text-xs text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition resize-none"
            />

            {/* Pago */}
            <div className="text-[10px] font-bold text-canela uppercase tracking-wider mt-1">
              ¿Cómo pagas?
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPago("efectivo")}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                  pago === "efectivo"
                    ? "bg-[#5B7A3A] text-white shadow-md"
                    : "bg-white text-[#5B7A3A] border-2 border-[#5B7A3A]/50 opacity-70"
                }`}
              >
                <IconCash size={18} />
                Efectivo
              </button>
              <button
                onClick={() => setPago("transferencia")}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                  pago === "transferencia"
                    ? "bg-[#004481] text-white shadow-md"
                    : "bg-white text-[#004481] border-2 border-[#004481]/50 opacity-70"
                }`}
              >
                <IconBuildingBank size={18} />
                Transferencia
              </button>
            </div>

            {/* Tarjeta BBVA cuando es transferencia */}
            {pago === "transferencia" && (
              <div className="bg-white rounded-xl p-3 border border-[#004481]/30 fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#004481] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    BBVA
                  </span>
                  <span
                    className="text-xs font-bold text-cafe"
                    style={{ fontFamily: "Termina" }}
                  >
                    {BENEFICIARIO}
                  </span>
                </div>
                <div className="text-[10px] text-canela mb-1.5">
                  Número de tarjeta
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-crema rounded-lg px-3 py-2 text-sm font-bold text-cafe tracking-wider">
                    {CUENTA_BBVA}
                  </div>
                  <button
                    onClick={copiarCuenta}
                    className="bg-[#004481] text-white px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                  >
                    {copiado ? (
                      <>
                        <IconCheck size={14} /> ¡Copié!
                      </>
                    ) : (
                      <>
                        <IconCopy size={14} /> Copiar
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[10px] text-canela mt-2 leading-relaxed">
                  Manda el comprobante por WhatsApp para confirmar tu antojo
                  🤎
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-cafe text-crema rounded-xl px-4 py-3 flex items-center justify-between mt-2">
              <span className="text-sm">Total</span>
              <span
                className="text-2xl"
                style={{ fontFamily: "ReginaBlack" }}
              >
                ${total.toFixed(0)}
              </span>
            </div>

            {/* Botón confirmar pedido */}
            <button
              onClick={confirmarPedido}
              disabled={enviando}
              className="w-full bg-cafe text-crema rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-70"
              style={{ letterSpacing: "0.2px" }}
            >
              <IconCircleCheck size={18} />
              {enviando ? "Anotando tu antojo..." : "Confirmar pedido"}
            </button>
            <p className="text-[10px] text-canela text-center -mt-1">
              Te confirmamos por WhatsApp cuando esté en el horno 🔥
            </p>
          </>
        )}
      </div>
    </div>
  );
}
