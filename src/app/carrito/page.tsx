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
import BottomNav from "@/components/BottomNav";
import RegistroInline from "@/components/RegistroInline";
import {
  getMinPickupDate,
  formatDeliveryDate,
  dateToIsoDay,
  listAvailableDates,
  formatDateShort,
} from "@/lib/delivery";
import { getSettings, Settings } from "@/lib/settings";
import { isBirthdayEligibleToday } from "@/lib/birthday";
import {
  getCapacity,
  getMultiDayOccupancy,
  canDateAcceptCart,
  STATUS_STYLE,
  type Capacity,
  type DayOccupancy,
  type Category,
} from "@/lib/capacity";
import {
  applyWelcomeCourtesy,
  checkWelcomeEligibility,
  type WelcomeStatus,
} from "@/lib/welcomeCourtesy";

const CUENTA_BBVA = "4152 3139 8399 7920";
const BENEFICIARIO = "Fabiola Castillo";

export default function Carrito() {
  const router = useRouter();
  const { items, cliente, total, setQty, clear } = useCarrito();
  const [pago, setPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [notas, setNotas] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [welcomeStatus, setWelcomeStatus] = useState<WelcomeStatus | null>(
    null
  );

  // Verificar elegibilidad de welcome courtesy
  useEffect(() => {
    if (!cliente?.id || !cliente.whatsapp) return;
    checkWelcomeEligibility({
      customerId: cliente.id,
      whatsapp: cliente.whatsapp,
    }).then(setWelcomeStatus);
  }, [cliente?.id, cliente?.whatsapp]);

  // Detectar si hay roles en el carrito + el precio del rol más barato
  const rolesEnCarrito = items.filter((it) => it.category === "rol");
  const hasRol = rolesEnCarrito.length > 0;
  const descuentoRol = hasRol
    ? Math.min(...rolesEnCarrito.map((it) => it.price))
    : 0;

  // Cumpleaños: con regla anti-trampa (7 días + 1x al año)
  const cumpleStatus = isBirthdayEligibleToday({
    birthday: cliente?.birthday,
    birthdaySetAt: cliente?.birthday_set_at,
    lastGreetedYear: cliente?.birthday_greeted_year,
  });
  const cumpleHoy = cumpleStatus.eligible;
  const aplicaCumple = cumpleHoy && hasRol;
  const descuentoCumple = aplicaCumple ? descuentoRol : 0;

  // Welcome courtesy automática (primeros 20 nuevos del piloto)
  const aplicaWelcome =
    !!welcomeStatus?.eligible && hasRol && !aplicaCumple;
  const descuentoWelcome = aplicaWelcome ? descuentoRol : 0;

  // Calcular fecha mínima según prep_days del carrito
  const maxPrepDays = items.reduce(
    (max, it) => Math.max(max, it.prep_days ?? 1),
    items.length > 0 ? 1 : 1
  );
  const minDate = getMinPickupDate(maxPrepDays);
  const fechaList = listAvailableDates(minDate, 14);
  const [pickupDate, setPickupDate] = useState<string>(dateToIsoDay(minDate));
  const [contactPerson, setContactPerson] = useState<"alex" | "fabiola">("fabiola");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [occupancyMap, setOccupancyMap] = useState<Map<string, DayOccupancy>>(
    new Map()
  );

  // Conteo del carrito por categoría (para validar capacidad)
  const cartCounts: Record<Category, number> = {
    rol: 0,
    berlinesa: 0,
    rollinbox: 0,
    luvinbox: 0,
  };
  for (const it of items) {
    if (it.category && it.category in cartCounts) {
      cartCounts[it.category as Category] += it.quantity;
    }
  }

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Cargar ocupación de las próximas fechas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const capacity = await getCapacity(supabase);
      // Solo si hay alguna capacidad configurada
      const hasAnyLimit = Object.values(capacity).some(
        (v) => typeof v === "number" && v > 0
      );
      if (!hasAnyLimit) {
        if (!cancelled) setOccupancyMap(new Map());
        return;
      }
      const dates = fechaList.map((d) => dateToIsoDay(d));
      const occupancies = await getMultiDayOccupancy(
        supabase,
        dates,
        capacity
      );
      if (cancelled) return;
      const map = new Map<string, DayOccupancy>();
      for (const occ of occupancies) {
        map.set(occ.date, occ);
      }
      setOccupancyMap(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Modelo B: ya no redirigimos si no hay cliente — el carrito muestra
  // un registro inline antes de poder confirmar.

  // Cuando cambia el contenido del carrito, recalcular fecha si quedó antes de la mínima
  useEffect(() => {
    if (pickupDate < dateToIsoDay(minDate)) {
      setPickupDate(dateToIsoDay(minDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPrepDays]);

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

      // Prioridad de descuento: cumpleaños > welcome > nada
      const descuentoFinal = aplicaCumple
        ? descuentoCumple
        : aplicaWelcome
          ? descuentoWelcome
          : 0;
      const finalTotal = Math.max(0, total - descuentoFinal);
      // 1. Crear el pedido (RLS permite a anon)
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: cliente.id,
          status: "pending",
          total: finalTotal,
          payment_method: pago,
          notes: notas || null,
          source: "pwa",
          pickup_date: pickupDate,
          contact_person: contactPerson,
          is_birthday_treat: aplicaCumple,
          is_welcome_courtesy: aplicaWelcome,
        })
        .select("id, folio")
        .single();

      if (orderErr) throw orderErr;

      // 2. Crear los items del pedido (con composición serializada en product_name)
      const orderItems = items.map((it) => {
        let nombreCompleto = it.name;
        if (it.composition && it.composition.length > 0) {
          const detalle = it.composition
            .map(
              (c) =>
                `${c.componentName}: ${c.selections
                  .map((s) => `${s.quantity}× ${s.name}`)
                  .join(", ")}`
            )
            .join(" | ");
          nombreCompleto = `${it.name} [${detalle}]`;
        }
        return {
          order_id: order.id,
          product_id: it.productId,
          product_name: nombreCompleto,
          quantity: it.quantity,
          unit_price: it.price,
        };
      });

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Si aplicó descuento de cumple, marcar el año en customer para que no se repita
      if (aplicaCumple && cliente.id) {
        await supabase
          .from("customers")
          .update({ birthday_greeted_year: new Date().getFullYear() })
          .eq("id", cliente.id);
      }

      // Si aplicó welcome courtesy, marcar al cliente + incrementar contador
      if (aplicaWelcome && cliente.id) {
        await applyWelcomeCourtesy(cliente.id);
      }

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
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-28">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
            <Miga pose="sentada" animation="sway" size={130} />
            <p className="text-canela text-sm leading-relaxed">
              Tu antojo está sin nada todavía.
              <br />
              <span className="text-caramelo italic">
                ¿Te ayudamos a escoger?
              </span>
            </p>

            {/* Mini banner Antójame */}
            <Link
              href="/antojame"
              className="relative w-full bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition shadow-md overflow-hidden"
            >
              <div className="relative w-16 h-16 flex-shrink-0 -my-2 -ml-1">
                <Image
                  src="/mascota/recomendando.png"
                  alt="Miga recomendando"
                  fill
                  sizes="64px"
                  className="object-cover object-top drop-shadow"
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">
                  No sé qué pedir…
                </div>
                <div
                  className="text-xl leading-none"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  ¡Antójame!
                </div>
              </div>
            </Link>

            <p className="text-[11px] text-canela mt-1">
              O si quieres antojarte solo:
            </p>
            <Link
              href="/catalogo"
              className="bg-cafe text-crema px-5 py-2.5 rounded-2xl text-sm font-bold active:scale-95 transition"
            >
              Ver menú completo
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Registro inline (Modelo B): solo si aún no hay cliente */}
            {!cliente && (
              <RegistroInline />
            )}

            {/* Banner cumpleaños (solo si aplica hoy) */}
            {aplicaCumple && cliente && (
              <div className="bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl p-3 flex items-center gap-3 shadow-lg cortesia-pop">
                <div className="text-3xl">🎂</div>
                <div className="flex-1">
                  <div
                    className="text-base leading-none"
                    style={{ fontFamily: "ReginaBlack" }}
                  >
                    ¡Feliz cumple, {cliente.name}!
                  </div>
                  <p className="text-[11px] opacity-95 mt-0.5 leading-snug">
                    Un rol va por la casa. Ya se descontó ($
                    {descuentoCumple.toFixed(0)}).
                  </p>
                </div>
              </div>
            )}
            {cumpleHoy && !hasRol && (
              <div className="bg-antojo/10 border border-antojo/30 text-cafe rounded-2xl p-3 flex items-center gap-2 cortesia-pop">
                <span className="text-2xl">🎂</span>
                <p className="text-[11px] leading-snug">
                  Hoy es tu cumple — <b>agrega un rol</b> y se te descuenta
                  automáticamente.
                </p>
              </div>
            )}

            {/* Items */}
            <ul className="flex flex-col gap-2">
              {items.map((it) => (
                <li
                  key={it.cartLineId}
                  className="bg-white rounded-xl p-2.5 flex flex-col gap-2 fade-up"
                >
                  <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-1 bg-crema rounded-xl px-1 py-0.5">
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity - 1)}
                        aria-label="Quitar uno"
                        className="text-cafe active:scale-90 transition w-9 h-9 flex items-center justify-center rounded-lg"
                      >
                        <IconMinus size={18} />
                      </button>
                      <span className="text-sm font-bold w-6 text-center text-cafe">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity + 1)}
                        aria-label="Agregar uno"
                        className="text-cafe active:scale-90 transition w-9 h-9 flex items-center justify-center rounded-lg"
                      >
                        <IconPlus size={18} />
                      </button>
                    </div>
                  </div>
                  {it.composition && it.composition.length > 0 && (
                    <ul className="ml-14 text-[11px] text-canela border-l-2 border-caramelo/30 pl-2 space-y-0.5">
                      {it.composition.map((c, i) => (
                        <li key={i}>
                          <b className="text-cafe">{c.componentName}:</b>{" "}
                          {c.selections
                            .map((s) => `${s.quantity}× ${s.name}`)
                            .join(", ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            {/* Cuándo recoges */}
            <div className="bg-white rounded-xl p-3 mt-1">
              <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-1">
                ¿Cuándo pasas por tu antojo?
              </div>
              <div className="text-[11px] text-canela mb-2">
                Lo más pronto:{" "}
                <b className="text-cafe capitalize">
                  {formatDeliveryDate(minDate)}
                </b>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {fechaList.map((d) => {
                  const iso = dateToIsoDay(d);
                  const active = iso === pickupDate;
                  const occ = occupancyMap.get(iso);
                  const check = occ
                    ? canDateAcceptCart(occ, cartCounts)
                    : { ok: true, blockingCategories: [] };
                  const blocked = !check.ok;
                  const tight =
                    occ &&
                    !blocked &&
                    (occ.worstStatus === "full" ||
                      occ.worstStatus === "tight");
                  return (
                    <button
                      key={iso}
                      onClick={() => !blocked && setPickupDate(iso)}
                      disabled={blocked}
                      title={
                        blocked
                          ? `Fecha llena para: ${check.blockingCategories.join(", ")}`
                          : tight
                            ? "Pocos cupos"
                            : undefined
                      }
                      className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                        blocked
                          ? "bg-canela/15 text-canela/50 line-through cursor-not-allowed"
                          : active
                            ? "bg-antojo text-white shadow"
                            : tight
                              ? "bg-[#F2A516]/15 text-[#B57A00] border border-[#F2A516]/40"
                              : "bg-crema text-cafe"
                      }`}
                    >
                      {tight && !blocked && (
                        <span className="absolute -top-1 -right-1 bg-[#F2A516] text-white text-[11px] rounded-full px-1 leading-tight">
                          !
                        </span>
                      )}
                      <div className="capitalize whitespace-nowrap">
                        {d.toLocaleDateString("es-MX", { weekday: "short" })}
                      </div>
                      <div>{formatDateShort(d)}</div>
                    </button>
                  );
                })}
              </div>
              {/* Aviso si la fecha actual está apretada o llena */}
              {(() => {
                const occ = occupancyMap.get(pickupDate);
                if (!occ) return null;
                const check = canDateAcceptCart(occ, cartCounts);
                if (!check.ok) {
                  return (
                    <div className="mt-2 bg-antojo/10 border border-antojo/30 text-cafe rounded-lg px-2.5 py-1.5 text-[11px] leading-snug">
                      🚫 Este día ya está lleno para{" "}
                      <b>{check.blockingCategories.join(", ")}</b>. Mejor escoge
                      otro día 🤎
                    </div>
                  );
                }
                if (
                  occ.worstStatus === "full" ||
                  occ.worstStatus === "tight"
                ) {
                  return (
                    <div className="mt-2 bg-[#F2A516]/10 border border-[#F2A516]/30 text-cafe rounded-lg px-2.5 py-1.5 text-[11px] leading-snug">
                      ⚠️ Día con pocos cupos. Si puedes mover tu antojo a otro
                      día nos das chance 🤎
                    </div>
                  );
                }
                return null;
              })()}
              <div className="text-[11px] text-canela mt-2 italic">
                Pasa por tu antojo o mándalo a recoger (Uber, DiDi, persona de
                confianza).
              </div>
            </div>

            {/* Notas */}
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="📝 Notas (sin nuez, alergias, hora preferida, etc.)"
              rows={2}
              className="w-full bg-white border border-caramelo/50 rounded-xl px-3 py-2 text-xs text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition resize-none"
            />

            {/* Punto de contacto */}
            <div className="text-[11px] font-bold text-canela uppercase tracking-wider mt-1">
              ¿Quién te atiende?
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setContactPerson("fabiola")}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                  contactPerson === "fabiola"
                    ? "bg-cafe text-crema shadow-md"
                    : "bg-white text-cafe border-2 border-canela/30 opacity-70"
                }`}
              >
                <span className="text-base">👩‍🍳</span>
                Fabiola
              </button>
              <button
                onClick={() => setContactPerson("alex")}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                  contactPerson === "alex"
                    ? "bg-cafe text-crema shadow-md"
                    : "bg-white text-cafe border-2 border-canela/30 opacity-70"
                }`}
              >
                <span className="text-base">👨‍🍳</span>
                Alex
              </button>
            </div>
            <p className="text-[11px] text-canela italic -mt-1">
              Tu pedido lo recibe quien tú elijas.
            </p>

            {/* Pago */}
            <div className="text-[11px] font-bold text-canela uppercase tracking-wider mt-1">
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
                  <span className="bg-[#004481] text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                    BBVA
                  </span>
                  <span
                    className="text-xs font-bold text-cafe"
                    style={{ fontFamily: "Termina" }}
                  >
                    {BENEFICIARIO}
                  </span>
                </div>
                <div className="text-[11px] text-canela mb-1.5">
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
                <div className="text-[11px] text-canela mt-2 leading-relaxed">
                  Manda el comprobante por WhatsApp para confirmar tu antojo
                  🤎
                </div>
              </div>
            )}

            {/* Welcome courtesy banner (automática, sin código) */}
            {aplicaWelcome && (
              <div className="bg-gradient-to-r from-antojo to-[#E04A18] text-white rounded-2xl p-3 flex items-center gap-3 shadow-lg cortesia-pop mt-1">
                <div className="text-3xl">🎁</div>
                <div className="flex-1">
                  <div
                    className="text-base leading-none"
                    style={{ fontFamily: "ReginaBlack" }}
                  >
                    ¡Bienvenido al antojo!
                  </div>
                  <p className="text-[11px] opacity-95 mt-0.5 leading-snug">
                    Eres parte de nuestros primeros comensales. Un rol va por
                    la casa — ya se descontó.
                  </p>
                </div>
              </div>
            )}
            {welcomeStatus?.eligible && !hasRol && (
              <div className="bg-antojo/10 border border-antojo/30 text-cafe rounded-2xl p-3 flex items-center gap-2 cortesia-pop mt-1">
                <span className="text-2xl">🎁</span>
                <p className="text-[11px] leading-snug">
                  Tienes un <b>rol cortesía de bienvenida</b> esperándote —
                  agrega un rol al carrito y se descuenta solito.
                </p>
              </div>
            )}

            {/* Total */}
            <div className="bg-cafe text-crema rounded-xl px-4 py-3 mt-2">
              {(aplicaCumple || aplicaWelcome) && (
                <>
                  <div className="flex items-center justify-between text-xs opacity-80">
                    <span>Subtotal</span>
                    <span>${total.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#FFD2A8]">
                    <span>
                      {aplicaCumple
                        ? "🎂 Rol de cumpleaños"
                        : "🎁 Rol de bienvenida"}
                    </span>
                    <span>
                      −$
                      {(aplicaCumple
                        ? descuentoCumple
                        : descuentoWelcome
                      ).toFixed(0)}
                    </span>
                  </div>
                  <div className="border-t border-crema/20 my-1.5" />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm">Total</span>
                <span
                  className="text-2xl"
                  style={{ fontFamily: "ReginaBlack" }}
                >
                  $
                  {Math.max(
                    0,
                    total -
                      (aplicaCumple
                        ? descuentoCumple
                        : aplicaWelcome
                          ? descuentoWelcome
                          : 0)
                  ).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Botón confirmar pedido (bloqueado si la fecha no acepta el carrito) */}
            {(() => {
              const occ = occupancyMap.get(pickupDate);
              const check = occ
                ? canDateAcceptCart(occ, cartCounts)
                : { ok: true, blockingCategories: [] };
              const bloqueado = !check.ok;
              const sinCliente = !cliente;
              return (
                <button
                  onClick={confirmarPedido}
                  disabled={enviando || bloqueado || sinCliente}
                  className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-50"
                  style={{ letterSpacing: "0.2px" }}
                >
                  <IconCircleCheck size={18} />
                  {sinCliente
                    ? "Cuéntanos quién eres ↑"
                    : bloqueado
                      ? "Día lleno · cambia la fecha"
                      : enviando
                        ? "Anotando tu antojo..."
                        : "Confirmar pedido"}
                </button>
              );
            })()}
            <p className="text-[11px] text-canela text-center -mt-1">
              Te confirmamos por WhatsApp cuando esté en el horno 🔥
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
