"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconShoppingBag, IconX } from "@tabler/icons-react";
import { useBoxBuilder } from "@/components/useBoxBuilder";
import BoxComponentsSelector from "@/components/BoxComponentsSelector";
import { useCarrito } from "@/components/CarritoProvider";
import { useToast } from "@/components/Toast";

/**
 * Popup para agregar OTRA caja (RollinBox / LuvinBox) eligiendo solo los
 * sabores. Ya sabemos qué caja es, así que evitamos toda la vuelta de volver
 * al catálogo y abrir la página completa otra vez.
 *
 * Se puede agregar varias seguidas (2ª, 3ª, 4ª) sin cerrar: cada vez que
 * agregas se limpian los sabores para escoger de nuevo.
 */
export default function BoxFlavorModal({
  boxId,
  open,
  onClose,
}: {
  boxId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { addBox, count } = useCarrito();
  const { show: showToast } = useToast();
  const {
    box,
    comps,
    loading,
    notFound,
    updateQty,
    reset,
    allComplete,
    total,
    missingCount,
    buildComposition,
  } = useBoxBuilder(open ? boxId : null);

  const [justAdded, setJustAdded] = useState(false);

  if (!open) return null;

  const nombreLimpio = box ? box.name.replace(/\s+\d+$/, "") : "caja";

  const onAdd = () => {
    if (!box || !allComplete) return;
    addBox(box, buildComposition(), total);
    showToast({
      title: `${box.name} armado`,
      subtitle: "Otra más en tu antojo 🤎",
      imageUrl: box.image_url,
    });
    setJustAdded(true);
    reset();
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cafe/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Hoja inferior */}
      <div className="relative w-full max-w-md bg-[var(--avellana-soft)] rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] animate-[sheetUp_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-caramelo/20 flex-shrink-0">
          <div
            className="text-lg text-cafe"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Arma otra {nombreLimpio}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-cafe w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto px-4 py-3 flex-1">
          {loading && (
            <div className="py-10 text-center text-canela text-sm">
              Cargando sabores…
            </div>
          )}
          {!loading && notFound && (
            <div className="py-10 text-center text-canela text-sm">
              No pudimos cargar esta caja. Intenta de nuevo.
            </div>
          )}
          {!loading && !notFound && (
            <BoxComponentsSelector comps={comps} updateQty={updateQty} />
          )}
        </div>

        {/* Footer total + acción */}
        <div className="flex-shrink-0 border-t border-caramelo/20 px-4 pt-3 bg-[var(--avellana-soft)]"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="bg-cafe rounded-2xl p-3 flex items-center justify-between mb-2 text-crema">
            <span className="text-xs">Total</span>
            <span className="text-xl" style={{ fontFamily: "ReginaBlack" }}>
              ${total.toFixed(0)}
            </span>
          </div>
          <button
            onClick={onAdd}
            disabled={!allComplete || loading}
            className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-50"
          >
            {justAdded ? (
              <>
                <IconCheck size={16} /> ¡Agregada!
              </>
            ) : !allComplete ? (
              <>Falta escoger {missingCount}</>
            ) : (
              <>
                Agregar al pedido <IconShoppingBag size={16} />
              </>
            )}
          </button>
          <button
            onClick={() => {
              onClose();
              router.push("/carrito");
            }}
            className="w-full text-center text-[12px] text-canela underline mt-2 py-1"
          >
            Listo · ver mi antojo{count > 0 ? ` (${count})` : ""}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes sheetUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
