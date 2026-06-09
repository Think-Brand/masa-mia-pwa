"use client";

import Image from "next/image";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconPlus,
  IconShoppingBag,
} from "@tabler/icons-react";
import { useCarrito } from "@/components/CarritoProvider";
import { useToast } from "@/components/Toast";
import { useBoxBuilder } from "@/components/useBoxBuilder";
import BoxComponentsSelector from "@/components/BoxComponentsSelector";

export default function BoxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-canela text-sm">
          Cargando…
        </div>
      }
    >
      <BoxConstructor />
    </Suspense>
  );
}

function BoxConstructor() {
  const router = useRouter();
  const params = useSearchParams();
  const { addBox, count } = useCarrito();
  const { show: showToast } = useToast();
  const boxId = params.get("id");

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
  } = useBoxBuilder(boxId);

  const [added, setAdded] = useState(false);

  // Sin id o caja inexistente → de vuelta al catálogo.
  useEffect(() => {
    if (!boxId || notFound) router.replace("/catalogo");
  }, [boxId, notFound, router]);

  const onAdd = () => {
    if (!box || !allComplete) return;
    addBox(box, buildComposition(), total);
    setAdded(true);
    showToast({
      title: `${box.name} armado`,
      subtitle: "Listo en tu carrito 🤎",
      imageUrl: box.image_url,
    });
  };

  // "Armar otra": limpia los sabores y se queda en la página (sin vueltas).
  const armarOtra = () => {
    reset();
    setAdded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading || !box) {
    return (
      <div className="min-h-screen flex items-center justify-center text-canela text-sm">
        Armando tu caja…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--avellana-soft)]"
      style={{ paddingBottom: "calc(168px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--avellana-soft)]/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-caramelo/20">
        <button
          onClick={() => router.back()}
          aria-label="Atrás"
          className="text-cafe"
        >
          <IconArrowLeft size={20} />
        </button>
        <div
          className="text-xl text-cafe text-center flex-1"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Arma tu {box.name.replace(/\s+\d+$/, "")}
        </div>
        <div className="w-5" />
      </header>

      {/* Imagen + descripción */}
      <div className="px-4 pt-4">
        {box.image_url && (
          <Image
            src={box.image_url}
            alt={box.name}
            width={500}
            height={500}
            className="w-full aspect-[2/1] object-cover rounded-2xl"
            priority
          />
        )}
        {box.description && (
          <p className="text-xs text-cafe mt-3 leading-relaxed">
            {box.description}
          </p>
        )}
      </div>

      {/* Componentes */}
      <div className="px-4 pt-4">
        <BoxComponentsSelector comps={comps} updateQty={updateQty} />
      </div>

      {/* Footer total + botón — anclado al fondo con safe-area para que no se
          empalme ni se mueva, y fácil de presionar. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-3 pt-3 bg-gradient-to-t from-[var(--avellana-soft)] via-[var(--avellana-soft)] to-transparent"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      >
        {!added && (
          <>
            <div className="bg-cafe rounded-2xl p-3 flex items-center justify-between mb-2 text-crema">
              <span className="text-xs">Total</span>
              <span className="text-xl" style={{ fontFamily: "ReginaBlack" }}>
                ${total.toFixed(0)}
              </span>
            </div>
            <button
              onClick={onAdd}
              disabled={!allComplete}
              className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-50"
            >
              {!allComplete ? (
                <>Falta escoger {missingCount}</>
              ) : (
                <>
                  Agregar al pedido <IconShoppingBag size={16} />
                </>
              )}
            </button>
          </>
        )}

        {/* Tras agregar: ofrecer armar otra sin volver al catálogo. */}
        {added && (
          <>
            <div className="bg-verde/15 text-cafe rounded-2xl p-2.5 mb-2 flex items-center justify-center gap-2 text-sm font-bold">
              <IconCheck size={16} className="text-verde" /> ¡Agregada a tu antojo!
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={armarOtra}
                className="bg-white border border-antojo/40 text-antojo rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
              >
                <IconPlus size={16} /> Armar otra
              </button>
              <button
                onClick={() => router.push("/carrito")}
                className="bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition shadow-lg"
              >
                <IconShoppingBag size={16} /> Mi antojo
                {count > 0 ? ` (${count})` : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
