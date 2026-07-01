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
  IconCalendar,
  IconCreditCard,
  IconNotes,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";
import BottomNav from "@/components/BottomNav";
import RegistroInline from "@/components/RegistroInline";
import EnvioPrompt from "@/components/EnvioPrompt";
import CollapsibleSection from "@/components/CollapsibleSection";
import StickyCheckoutBar from "@/components/StickyCheckoutBar";
import UbicacionPickup from "@/components/UbicacionPickup";
import AntojameBanner from "@/components/AntojameBanner";
import BoxFlavorModal from "@/components/BoxFlavorModal";
import {
  getMinPickupDate,
  formatDeliveryDate,
  dateToIsoDay,
  listAvailableDates,
  listAllDatesFrom,
  todayStart,
  listPickupTimeSlots,
  formatPickupTimeLabel,
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
  // Box (RollinBox/LuvinBox) a re-armar en el popup de "otra igual".
  const [boxOtraId, setBoxOtraId] = useState<string | null>(null);
  const [welcomeStatus, setWelcomeStatus] = useState<WelcomeStatus | null>(
    null
  );
  // ¿El que está usando el carrito es staff (Fabiola/Alex/Mario) logueado?
  // El staff captura pedidos tradicionales a nombre del cliente y NO debe
  // toparse con las reglas de cupo, vacaciones ni el filtro L-V: ellos manejan
  // la capacidad de cabeza y deben poder agendar cualquier día.
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setIsStaff(!!data.user);
    });
    return () => {
      alive = false;
    };
  }, []);

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
  // Staff: días corridos desde hoy (incluye fines de semana, sin filtro L-V).
  // Cliente: solo días hábiles a partir de la fecha mínima de preparación.
  const fechaList = isStaff
    ? listAllDatesFrom(todayStart(), 30)
    : listAvailableDates(minDate, 14);
  const [pickupDate, setPickupDate] = useState<string>(dateToIsoDay(minDate));
  // Horario de recogida (HH:MM, slot de 30min). Default: 12:00 (mediodía).
  const [pickupTime, setPickupTime] = useState<string>("12:00");
  const TIME_SLOTS = listPickupTimeSlots();
  // contact_person ya no lo elige el cliente; se queda como default
  // para mantener compatibilidad con el flujo histórico del staff.
  const contactPerson: "alex" | "fabiola" = "fabiola";
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
  // Validación estricta: aceptamos cliente solo si tiene id + name + whatsapp.
  // Si alguno falta (ej. logout legacy dejó {name:"", whatsapp:""}), tratamos
  // como si no hubiera cliente y mostramos el registro inline.
  // `!!cliente` arriba para que TS narrows en el resto del chain.
  const clienteValido =
    !!cliente &&
    !!cliente.id &&
    !!cliente.name?.trim() &&
    !!cliente.whatsapp &&
    cliente.whatsapp.length === 10;

  // Cuando cambia el contenido del carrito, recalcular fecha si quedó antes de
  // la mínima. El staff puede elegir días anteriores a la mínima del cliente
  // (incluso hoy), así que no le forzamos el salto.
  useEffect(() => {
    if (!isStaff && pickupDate < dateToIsoDay(minDate)) {
      setPickupDate(dateToIsoDay(minDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPrepDays, isStaff]);

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
    if (items.length === 0) return;
    // Guardarraíl de seguridad: NUNCA enviar pedido sin cliente válido.
    // Antes de Modelo B el guard era `!cliente`, pero un cliente con
    // {name:"", whatsapp:""} pasaba como truthy y creaba pedidos huérfanos.
    if (!clienteValido || !cliente?.id) {
      alert(
        "Falta tu nombre y WhatsApp para confirmar el pedido. Llénalos arriba."
      );
      return;
    }
    setEnviando(true);
    try {
      const supabase = createClient();

      // ¿El día elegido quedó a tope? No bloquea, pero marcamos el pedido
      // como over_capacity para que la cocina lo revise y confirme.
      const occSel = occupancyMap.get(pickupDate);
      const overCap =
        !isStaff && occSel
          ? !canDateAcceptCart(occSel, cartCounts).ok
          : false;

      // El pedido se crea vía RPC `create_order`: el servidor recalcula
      // todos los precios desde la BD (products + price_modifier de opciones),
      // valida descuentos (cumple/welcome) y crea orden + items en una sola
      // transacción. Los precios del carrito son solo para mostrar en UI.
      const { data: order, error: orderErr } = await supabase.rpc(
        "create_order",
        {
          p_customer_id: cliente.id,
          p_payment_method: pago,
          p_notes: notas || null,
          p_pickup_date: pickupDate,
          p_pickup_time: pickupTime,
          p_contact_person: contactPerson,
          p_request_birthday: aplicaCumple,
          p_request_welcome: aplicaWelcome,
          p_items: items.map((it) => ({
            product_id: it.productId,
            quantity: it.quantity,
            composition:
              it.composition && it.composition.length > 0
                ? it.composition
                : null,
          })),
          p_over_capacity: overCap,
        }
      );

      if (orderErr) throw orderErr;
      if (!order?.folio) throw new Error("El servidor no devolvió folio.");

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
    <div
      className="min-h-screen flex flex-col max-w-md mx-auto"
      style={{ paddingBottom: items.length > 0 ? "140px" : "100px" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center justify-between px-4 py-3">
        <Link href="/catalogo" aria-label="Atrás" className="text-cafe">
          <IconArrowLeft size={20} />
        </Link>
        <div className="flex flex-col items-center">
          <h1
            className="text-2xl text-cafe leading-none"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Mi antojo
          </h1>
          {items.length > 0 && (
            <span className="text-[10px] text-canela uppercase tracking-widest mt-0.5">
              {items.reduce((n, it) => n + it.quantity, 0)} pza
              {items.reduce((n, it) => n + it.quantity, 0) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="w-5" />
      </header>

      <div className="flex-1 px-4 flex flex-col gap-3">
        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
            <Miga emocion="confundida" animation="sway" size={200} />
            <p className="text-canela text-sm leading-relaxed">
              Tu antojo está sin nada todavía.
              <br />
              <span className="text-caramelo italic">
                ¿Te ayudamos a escoger?
              </span>
            </p>

            {/* Banner Antójame — componente compartido, centrado */}
            <AntojameBanner className="w-full" />

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
            {/* Registro inline (Modelo B): cuando el cliente no es válido */}
            {!clienteValido && (
              <RegistroInline />
            )}

            {/* Banner cumpleaños (solo si aplica hoy) */}
            {aplicaCumple && clienteValido && cliente && (
              <div className="bg-gradient-to-r from-antojo to-antojo-darker text-white rounded-2xl p-3 flex items-center gap-3 shadow-lg cortesia-pop">
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
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(242,92,32,0.06), rgba(242,92,32,0.16))",
                      }}
                    >
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity - 1)}
                        aria-label="Quitar uno"
                        className="btn-masa btn-masa-mini"
                      >
                        <IconMinus size={16} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center text-cafe">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQty(it.cartLineId, it.quantity + 1)}
                        aria-label="Agregar uno"
                        className="btn-masa btn-masa-mini"
                      >
                        <IconPlus size={16} />
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
                  {/* Atajo: agregar otra caja igual eligiendo solo los sabores,
                      sin volver al catálogo. */}
                  {it.composition && it.composition.length > 0 && (
                    <button
                      onClick={() => setBoxOtraId(it.productId)}
                      className="ml-14 self-start flex items-center gap-1 text-[11px] font-bold text-antojo bg-antojo/10 rounded-full px-2.5 py-1 active:scale-95 transition"
                    >
                      <IconPlus size={13} /> Otra igual · elige sabores
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* Cuándo pasas — fecha + hora en una sola sección colapsable */}
            <CollapsibleSection
              icon={<IconCalendar size={18} />}
              title="¿Cuándo pasas?"
              summary={(() => {
                const fechaSel = fechaList.find(
                  (d) => dateToIsoDay(d) === pickupDate
                );
                if (!fechaSel) return "Escoge fecha y hora";
                const fechaTxt = fechaSel.toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                return (
                  <span className="capitalize">
                    {fechaTxt} · {formatPickupTimeLabel(pickupTime)}
                  </span>
                );
              })()}
              defaultOpen={false}
            >
              {isStaff ? (
                <div className="bg-cafe/10 border border-cafe/20 rounded-lg px-2.5 py-1.5 mb-2 text-[11px] text-cafe leading-snug flex items-center gap-1.5">
                  <span>👩‍🍳</span>
                  <span>
                    <b>Modo cocina:</b> pedido capturado por staff. Sin límites de
                    cupo ni vacaciones — elige cualquier día.
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-canela mb-2">
                  Lo más pronto:{" "}
                  <b className="text-cafe capitalize">
                    {formatDeliveryDate(minDate)}
                  </b>
                </div>
              )}
              {!isStaff && settings?.vacation_active === "on" && (
                <div className="bg-antojo/10 border border-antojo/30 rounded-lg px-2.5 py-1.5 mb-2 text-[11px] text-cafe leading-snug">
                  <b>🥐 {settings.vacation_message}</b>
                  <div className="text-canela mt-0.5">
                    Las fechas del{" "}
                    <b className="text-cafe">{settings.vacation_from}</b> al{" "}
                    <b className="text-cafe">{settings.vacation_to}</b> no
                    están disponibles.
                  </div>
                </div>
              )}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {fechaList.map((d) => {
                  const iso = dateToIsoDay(d);
                  const active = iso === pickupDate;
                  const occ = occupancyMap.get(iso);
                  const check = occ
                    ? canDateAcceptCart(occ, cartCounts)
                    : { ok: true, blockingCategories: [] };
                  // Bloqueo por modo vacaciones (settings). El cupo YA NO
                  // bloquea: el cliente siempre puede pedir; si el día está a
                  // tope, su pedido queda sujeto a confirmación de la cocina.
                  const enVacaciones =
                    settings?.vacation_active === "on" &&
                    settings.vacation_from &&
                    settings.vacation_to &&
                    iso >= settings.vacation_from &&
                    iso <= settings.vacation_to;
                  // Staff sin restricciones. Cliente: solo vacaciones bloquea.
                  const blocked = isStaff ? false : !!enVacaciones;
                  // Día a tope (sobre capacidad): se puede elegir, pero avisamos.
                  const aTope = !isStaff && !blocked && !check.ok;
                  // Apretado (pocos cupos), solo informativo.
                  const tight =
                    !isStaff &&
                    !blocked &&
                    !aTope &&
                    occ &&
                    (occ.worstStatus === "full" ||
                      occ.worstStatus === "tight");
                  const warn = aTope || tight;
                  return (
                    <button
                      key={iso}
                      onClick={() => !blocked && setPickupDate(iso)}
                      disabled={blocked}
                      title={
                        enVacaciones
                          ? settings?.vacation_message ||
                            "Estamos en vacaciones"
                          : aTope
                            ? "Ese día vamos a tope — tu pedido queda sujeto a confirmación"
                            : tight
                              ? "Pocos cupos"
                              : undefined
                      }
                      className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                        blocked
                          ? "bg-canela/15 text-canela/50 line-through cursor-not-allowed"
                          : active
                            ? "bg-antojo text-white shadow"
                            : warn
                              ? "bg-oro/15 text-[#B57A00] border border-oro/40"
                              : "bg-crema text-cafe"
                      }`}
                    >
                      {warn && !blocked && (
                        <span className="absolute -top-1 -right-1 bg-oro text-white text-[11px] rounded-full px-1 leading-tight">
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
                if (isStaff) return null;
                const occ = occupancyMap.get(pickupDate);
                if (!occ) return null;
                const check = canDateAcceptCart(occ, cartCounts);
                if (!check.ok) {
                  return (
                    <div className="mt-2 bg-oro/10 border border-oro/40 text-cafe rounded-lg px-2.5 py-1.5 text-[11px] leading-snug">
                      🍞 Ese día vamos <b>a tope</b> en la cocina. Puedes pedir
                      igual, pero tu pedido queda <b>sujeto a confirmación</b>:
                      te avisamos por WhatsApp en cuanto lo confirmemos 🤎
                    </div>
                  );
                }
                if (
                  occ.worstStatus === "full" ||
                  occ.worstStatus === "tight"
                ) {
                  return (
                    <div className="mt-2 bg-oro/10 border border-oro/30 text-cafe rounded-lg px-2.5 py-1.5 text-[11px] leading-snug">
                      ⚠️ Día con pocos cupos. Si puedes mover tu antojo a otro
                      día nos das chance 🤎
                    </div>
                  );
                }
                return null;
              })()}
              <div className="text-[11px] text-canela mt-2 italic">
                Pasa por tu antojo o mándalo a recoger (Uber, DiDi, persona de
                confianza). Atendemos solo de lunes a viernes — para fines de
                semana o eventos usa{" "}
                <Link
                  href="/pedido-especial"
                  className="text-antojo font-bold underline"
                >
                  pedido especial
                </Link>
                .
              </div>

              {/* Selector de hora de recogida — grid 4 cols sin scroll
                  horizontal, todos los slots visibles de un vistazo. */}
              <div className="mt-3 pt-3 border-t border-caramelo/20">
                <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-1.5">
                  ¿A qué hora pasas?
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_SLOTS.map((slot) => {
                    const active = slot === pickupTime;
                    return (
                      <button
                        key={slot}
                        onClick={() => setPickupTime(slot)}
                        className={`px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                          active
                            ? "bg-antojo text-white shadow"
                            : "bg-crema text-cafe"
                        }`}
                      >
                        {formatPickupTimeLabel(slot)}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-canela mt-1.5 italic">
                  Atendemos de 8 am a 8 pm. Si necesitas otra hora, mándanos
                  un{" "}
                  <Link
                    href="/pedido-especial"
                    className="text-antojo font-bold underline"
                  >
                    pedido especial
                  </Link>
                  .
                </div>
              </div>
            </CollapsibleSection>

            {/* Pago — método + datos BBVA colapsados */}
            <CollapsibleSection
              icon={<IconCreditCard size={18} />}
              title="¿Cómo pagas?"
              summary={
                pago === "transferencia"
                  ? "Transferencia BBVA"
                  : "Efectivo al recibir"
              }
              defaultOpen={false}
            >
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

              {/* Datos BBVA dentro de la misma sección cuando transferencia */}
              {pago === "transferencia" && (
                <div className="bg-crema-soft rounded-xl p-3 border border-[#004481]/30 fade-up mt-2">
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
                    <div className="flex-1 bg-white rounded-lg px-3 py-2 text-sm font-bold text-cafe tracking-wider">
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
            </CollapsibleSection>

            {/* Notas — colapsadas por default. La mayoría no las usa. */}
            <CollapsibleSection
              icon={<IconNotes size={18} />}
              title="Notas (opcional)"
              summary={
                notas.trim()
                  ? notas.length > 40
                    ? notas.slice(0, 40) + "…"
                    : notas
                  : "Sin nota"
              }
              defaultOpen={false}
            >
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Sin nuez, alergias, instrucciones especiales…"
                rows={3}
                className="w-full bg-crema-soft border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition resize-none"
              />
            </CollapsibleSection>

            {/* Ubicación fija — siempre visible: dónde recoges + sin envíos */}
            <UbicacionPickup settings={settings} />

            {/* Welcome courtesy banner (automática, sin código) */}
            {aplicaWelcome && (
              <div className="bg-gradient-to-r from-antojo to-antojo-darker text-white rounded-2xl p-3 flex items-center gap-3 shadow-lg cortesia-pop mt-1">
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

            {/* Link discreto a pedido especial — solo si quieren algo fuera
                de lo normal */}
            <Link
              href="/pedido-especial"
              className="text-[11px] text-canela text-center italic underline mt-1"
            >
              ¿Evento o fin de semana? Haz un pedido especial ✨
            </Link>

            {/* Consulta de envío — solo si el carrito es generoso */}
            <EnvioPrompt
              total={Math.max(
                0,
                total -
                  (aplicaCumple
                    ? descuentoCumple
                    : aplicaWelcome
                      ? descuentoWelcome
                      : 0)
              )}
              nombreCliente={cliente?.name}
              resumenItems={items
                .map((it) => `${it.quantity}× ${it.name}`)
                .join(", ")}
              fabiolaWa={settings?.contact_fabiola_wa}
              umbral={400}
            />
          </>
        )}
      </div>

      {/* Sticky bottom: total + descuento inline + botón confirmar.
          Solo cuando hay items en el carrito. */}
      {items.length > 0 &&
        (() => {
          // El cupo YA NO bloquea (pedir siempre; queda sujeto a confirmación).
          // Solo el modo vacaciones bloquea al cliente. Staff nunca se bloquea.
          const enVacacionesSel =
            !isStaff &&
            settings?.vacation_active === "on" &&
            !!settings.vacation_from &&
            !!settings.vacation_to &&
            pickupDate >= settings.vacation_from &&
            pickupDate <= settings.vacation_to;
          const bloqueado = !!enVacacionesSel;
          const sinCliente = !clienteValido;
          const descuentoLabel = aplicaCumple
            ? "🎂 Rol de cumpleaños"
            : aplicaWelcome
              ? "🎁 Rol de bienvenida"
              : null;
          const descuentoMonto = aplicaCumple
            ? descuentoCumple
            : aplicaWelcome
              ? descuentoWelcome
              : 0;
          const totalFinal = Math.max(0, total - descuentoMonto);
          const ctaLabel = sinCliente
            ? "Cuéntanos quién eres ↑"
            : bloqueado
              ? "En vacaciones · cambia la fecha"
              : enviando
                ? "Anotando tu antojo…"
                : "Confirmar pedido";
          return (
            <StickyCheckoutBar
              subtotal={total}
              descuento={
                descuentoLabel
                  ? { label: descuentoLabel, monto: descuentoMonto }
                  : null
              }
              total={totalFinal}
              ctaLabel={ctaLabel}
              disabled={bloqueado || sinCliente}
              loading={enviando}
              onConfirm={confirmarPedido}
            />
          );
        })()}

      {/* BottomNav solo cuando el carrito está vacío (el sticky checkout
          reemplaza la nav cuando hay items para no apilar 2 barras). */}
      {items.length === 0 && <BottomNav />}

      {/* Popup para armar otra caja igual eligiendo solo sabores */}
      <BoxFlavorModal
        boxId={boxOtraId}
        open={boxOtraId !== null}
        onClose={() => setBoxOtraId(null)}
      />
    </div>
  );
}
