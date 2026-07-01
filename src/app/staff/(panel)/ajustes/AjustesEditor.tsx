"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  IconBell,
  IconBox,
  IconBuildingStore,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircleDot,
  IconCopy,
  IconDeviceFloppy,
  IconFlask,
  IconGauge,
  IconLoader2,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import StaffOnboarding from "@/components/StaffOnboarding";
import PushNotificationsCard from "@/components/PushNotificationsCard";
import { resetTour, STAFF_TOUR_ID } from "@/lib/onboarding";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  STATUS_STYLE,
  getCapacity,
  getMultiDayOccupancy,
  saveCapacity,
  type Capacity,
  type DayOccupancy,
} from "@/lib/capacity";

type Tab =
  | "productos"
  | "boxes"
  | "negocio"
  | "capacidad"
  | "notificaciones"
  | "piloto";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_public: boolean;
  is_active: boolean;
  is_limited: boolean | null;
  is_new: boolean | null;
  sort_order: number;
};

type BoxComp = {
  id: string;
  box_product_id: string;
  name: string;
  quantity: number;
  is_active: boolean;
  sort_order: number;
};

type CompOpt = {
  id: string;
  component_id: string;
  name: string;
  is_available: boolean;
  sort_order: number;
  image_url: string | null;
};

type Setting = { key: string; value: string; description: string | null };

export default function AjustesEditor() {
  const [tab, setTab] = useState<Tab>("productos");

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <TabBtn
          active={tab === "productos"}
          onClick={() => setTab("productos")}
          icon={<IconCircleDot size={14} />}
          label="Productos"
        />
        <TabBtn
          active={tab === "boxes"}
          onClick={() => setTab("boxes")}
          icon={<IconBox size={14} />}
          label="Boxes"
        />
        <TabBtn
          active={tab === "negocio"}
          onClick={() => setTab("negocio")}
          icon={<IconBuildingStore size={14} />}
          label="Negocio"
        />
        <TabBtn
          active={tab === "capacidad"}
          onClick={() => setTab("capacidad")}
          icon={<IconGauge size={14} />}
          label="Capacidad"
        />
        <TabBtn
          active={tab === "notificaciones"}
          onClick={() => setTab("notificaciones")}
          icon={<IconBell size={14} />}
          label="Avisos"
        />
        <TabBtn
          active={tab === "piloto"}
          onClick={() => setTab("piloto")}
          icon={<IconFlask size={14} />}
          label="Piloto"
        />
      </div>

      {tab === "productos" && <ProductosPanel />}
      {tab === "boxes" && <BoxesPanel />}
      {tab === "negocio" && <NegocioPanel />}
      {tab === "capacidad" && <CapacidadPanel />}
      {tab === "notificaciones" && <NotificacionesPanel />}
      {tab === "piloto" && <PilotoPanel />}
    </div>
  );
}

function CapacidadPanel() {
  const [capacity, setCapacity] = useState<Capacity>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [occupancies, setOccupancies] = useState<DayOccupancy[]>([]);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const cap = await getCapacity(supabase);
    setCapacity(cap);
    // Calcular próximos 7 días
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    const occ = await getMultiDayOccupancy(supabase, dates, cap);
    setOccupancies(occ);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const guardar = async () => {
    setSaving(true);
    const supabase = createClient();
    await saveCapacity(supabase, capacity);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Recargar ocupación con la nueva capacidad
    load();
  };

  const hasAnyLimit = Object.values(capacity).some(
    (v) => typeof v === "number" && v > 0
  );

  return (
    <div className="space-y-4">
      <Section title="🚦 Capacidad diaria por categoría">
        <p className="text-[11px] text-canela leading-relaxed mb-3">
          Define cuánto puedes producir al día por categoría. Deja en blanco lo
          que no quieras limitar. Si una categoría llega a su tope, esa fecha
          se bloquea para el cliente.
        </p>

        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <div key={c} className="flex items-center gap-3">
              <label
                className="flex-1 text-sm font-bold text-cafe"
                style={{ fontFamily: "Termina" }}
              >
                {CATEGORY_LABEL[c]}
              </label>
              <input
                type="number"
                min="0"
                placeholder="—"
                value={capacity[c] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setCapacity((prev) => ({
                    ...prev,
                    [c]: v === "" ? null : Number(v),
                  }));
                }}
                className="w-24 bg-white border border-caramelo/40 rounded-xl px-3 py-2 text-sm text-cafe text-center focus:outline-none focus:border-cafe"
              />
              <span className="text-[11px] text-canela w-12">
                {c === "rol" || c === "berlinesa" ? "piezas" : "cajas"}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={guardar}
          disabled={saving}
          className="mt-4 w-full bg-antojo text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50 shadow-md"
        >
          {saving ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : saved ? (
            <IconCheck size={14} />
          ) : (
            <IconDeviceFloppy size={14} />
          )}
          {saved ? "Guardado" : "Guardar capacidad"}
        </button>

        {!hasAnyLimit && (
          <p className="text-[11px] text-canela italic mt-2 text-center">
            Mientras esté en blanco, no hay límite (sistema apagado).
          </p>
        )}
      </Section>

      {/* Próximos 7 días */}
      <Section title="📅 Próximos 7 días">
        {loading ? (
          <div className="text-center py-6 text-canela">
            <IconLoader2 size={18} className="animate-spin inline" />
          </div>
        ) : !hasAnyLimit ? (
          <p className="text-xs text-canela italic text-center py-4">
            Define al menos una capacidad arriba para ver la ocupación.
          </p>
        ) : (
          <div className="space-y-2">
            {occupancies.map((occ, i) => {
              const d = new Date(occ.date + "T12:00:00");
              const isHoy = i === 0;
              return (
                <div
                  key={occ.date}
                  className={`bg-white rounded-xl p-2.5 border ${
                    occ.worstStatus === "over"
                      ? "border-rojo/40"
                      : occ.worstStatus === "full" ||
                          occ.worstStatus === "tight"
                        ? "border-oro/40"
                        : "border-caramelo/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div
                      className="text-xs font-bold text-cafe capitalize"
                      style={{ fontFamily: "Termina" }}
                    >
                      {isHoy
                        ? "Hoy"
                        : i === 1
                          ? "Mañana"
                          : d.toLocaleDateString("es-MX", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                    </div>
                    {occ.hasAlert && (
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[occ.worstStatus].text} bg-white border ${STATUS_STYLE[occ.worstStatus].dot.replace("bg-", "border-")}`}
                      >
                        {STATUS_STYLE[occ.worstStatus].label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {occ.rows
                      .filter((r) => r.status !== "unlimited")
                      .map((r) => (
                        <div
                          key={r.category}
                          className="flex items-center gap-2"
                        >
                          <span className="text-[11px] text-canela w-16">
                            {CATEGORY_LABEL[r.category]}
                          </span>
                          <div className="flex-1 bg-crema-soft rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${STATUS_STYLE[r.status].bar} transition-all`}
                              style={{
                                width: `${Math.min(100, r.percentage)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold w-14 text-right ${STATUS_STYLE[r.status].text}`}
                          >
                            {r.used}/{r.limit}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function NotificacionesPanel() {
  return (
    <div className="space-y-4">
      <Section title="🔔 Notificaciones de pedidos">
        <PushNotificationsCard />
        <p className="text-[11px] text-canela italic mt-3 leading-relaxed">
          Cada dispositivo (iPhone, iPad) se activa por separado. Mario, Faby
          y Alex tienen que entrar aquí desde su propio dispositivo y
          prender las notificaciones.
        </p>
      </Section>
    </div>
  );
}

function PilotoPanel() {
  const [pilotMode, setPilotMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [welcomeMax, setWelcomeMax] = useState<number>(20);
  const [welcomeCount, setWelcomeCount] = useState<number>(0);
  const [savingMax, setSavingMax] = useState(false);
  const [maxDraft, setMaxDraft] = useState<string>("20");
  const [showTour, setShowTour] = useState(false);

  const verTourDeNuevo = () => {
    resetTour(STAFF_TOUR_ID);
    setShowTour(true);
  };

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["pilot_mode", "pilot_welcome_max", "pilot_welcome_count"]);
    const map = new Map<string, string>();
    for (const s of settings ?? []) map.set(s.key, s.value);
    setPilotMode(map.get("pilot_mode") === "on");
    const max = parseInt(map.get("pilot_welcome_max") || "20", 10);
    setWelcomeMax(max);
    setMaxDraft(String(max));
    setWelcomeCount(parseInt(map.get("pilot_welcome_count") || "0", 10));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePilot = async (on: boolean) => {
    setPilotMode(on);
    const supabase = createClient();
    await supabase
      .from("settings")
      .update({ value: on ? "on" : "off" })
      .eq("key", "pilot_mode");
  };

  const guardarMax = async () => {
    const n = Math.max(0, parseInt(maxDraft || "0", 10));
    setSavingMax(true);
    const supabase = createClient();
    await supabase
      .from("settings")
      .update({ value: String(n) })
      .eq("key", "pilot_welcome_max");
    setWelcomeMax(n);
    setSavingMax(false);
  };

  const resetContador = async () => {
    if (!confirm("¿Reiniciar el contador a 0? Los clientes ya marcados seguirán marcados.")) return;
    const supabase = createClient();
    await supabase
      .from("settings")
      .update({ value: "0" })
      .eq("key", "pilot_welcome_count");
    setWelcomeCount(0);
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-canela">
        <IconLoader2 size={20} className="animate-spin inline" /> Cargando…
      </div>
    );
  }

  const remaining = Math.max(0, welcomeMax - welcomeCount);
  const pct = welcomeMax > 0 ? Math.min(100, (welcomeCount / welcomeMax) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Toggle modo piloto */}
      <Section title="🧪 Modo prueba piloto">
        <SwitchRow
          label="Activar piloto"
          sub="Feedback post-pedido + cortesía de bienvenida automática + tour Miga"
          value={pilotMode}
          onChange={togglePilot}
        />
        <p className="text-[11px] text-canela italic">
          Cuando esté encendido: cada cliente <b>nuevo</b> (no Mario, Faby o
          Alex) recibe <b>1 rol cortesía</b> en su primer pedido,
          automáticamente — sin código. Pop-up de feedback al confirmar
          pedido. Y los testers ven el tour de Miga la primera vez.
        </p>

        <button
          onClick={verTourDeNuevo}
          className="mt-3 text-xs text-cafe bg-white border border-caramelo/40 rounded-full px-4 py-2 inline-flex items-center gap-1.5 active:scale-95 transition shadow-sm"
        >
          <IconSparkles size={14} className="text-antojo" />
          Ver tour del panel otra vez
        </button>
      </Section>

      {/* Welcome courtesy */}
      <Section title="🎁 Cortesías de bienvenida">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <CodeStat label="Otorgadas" value={String(welcomeCount)} />
          <CodeStat label="Restantes" value={String(remaining)} />
          <CodeStat label="Tope" value={String(welcomeMax)} />
        </div>
        <p className="text-[11px] text-canela italic mb-3 leading-relaxed">
          Se cuenta al <b>confirmar el pedido</b> (no al entregarlo) para
          reservar el cupo y que no se regalen de más si caen pedidos
          simultáneos.
        </p>

        {/* Barra de progreso */}
        <div className="bg-crema-soft rounded-full h-2 overflow-hidden mb-3">
          <div
            className="h-full bg-antojo transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Editar tope */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-canela uppercase tracking-wider flex-1">
            Tope total
          </label>
          <input
            type="number"
            min="0"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            className="w-20 bg-crema-soft border border-caramelo/30 rounded-lg px-2 py-2 text-sm text-cafe focus:outline-none focus:border-cafe text-center"
          />
          <button
            onClick={guardarMax}
            disabled={savingMax || parseInt(maxDraft, 10) === welcomeMax}
            className="bg-antojo text-white rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            {savingMax ? (
              <IconLoader2 size={12} className="animate-spin" />
            ) : (
              <IconCheck size={12} />
            )}
            Guardar
          </button>
        </div>

        <button
          onClick={resetContador}
          className="mt-3 text-[11px] text-canela underline active:scale-95"
        >
          Reiniciar contador a 0
        </button>

        <p className="text-[11px] text-canela italic mt-2 leading-relaxed">
          Excluidos: Mario · Faby · Alex (no reciben la cortesía aunque pidan).
        </p>
      </Section>

      {/* Tour bajo demanda (forceShow ignora pilot_mode) */}
      {showTour && (
        <StaffOnboarding forceShow onClose={() => setShowTour(false)} />
      )}
    </div>
  );
}

function CodeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-crema-soft rounded-lg p-2 text-center">
      <div
        className="text-xl font-bold text-antojo"
        style={{ fontFamily: "Termina" }}
      >
        {value}
      </div>
      <div className="text-[11px] text-canela uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
        active
          ? "bg-cafe text-crema shadow-md"
          : "bg-white text-cafe border border-canela/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ===================== PRODUCTOS ===================== */

function ProductosPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("category")
      .order("sort_order");
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = async (id: string, patch: Partial<Product>) => {
    const supabase = createClient();
    await supabase.from("products").update(patch).eq("id", id);
    setProducts((curr) =>
      curr.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-canela">
        <IconLoader2 size={20} className="animate-spin inline" /> Cargando…
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setCreating(true)}
        className="w-full bg-antojo text-white rounded-2xl py-3 mb-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-md"
      >
        <IconPlus size={16} /> Agregar producto nuevo
      </button>

      {creating && (
        <NuevoProductoModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      <ul className="flex flex-col gap-2">
      {products.map((p) => {
        const isExpanded = expanded === p.id;
        return (
          <li
            key={p.id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : p.id)}
              className="w-full p-3 flex items-center gap-3 active:bg-crema-soft transition text-left"
            >
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.name}
                  width={56}
                  height={56}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-crema flex items-center justify-center text-xl">
                  🥖
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-bold text-cafe truncate"
                  style={{ fontFamily: "Termina" }}
                >
                  {p.name}
                </div>
                <div className="text-[11px] text-canela capitalize">
                  {p.category} · ${Number(p.price).toFixed(0)}
                </div>
                <div className="flex gap-1 mt-1">
                  {!p.is_public && (
                    <Pill tone="muted">Oculto</Pill>
                  )}
                  {!p.is_active && <Pill tone="muted">Inactivo</Pill>}
                  {p.is_limited && <Pill tone="antojo">Ed. limitada</Pill>}
                  {p.is_new && <Pill tone="verde">Nuevo</Pill>}
                </div>
              </div>
              {isExpanded ? (
                <IconChevronDown size={16} className="text-canela" />
              ) : (
                <IconChevronRight size={16} className="text-canela" />
              )}
            </button>

            {isExpanded && (
              <ProductEditForm product={p} onSave={updateField} />
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

function NuevoProductoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("rol");
  const [price, setPrice] = useState("70");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setError("La foto debe pesar menos de 4 MB.");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Pon un nombre.");
    if (Number(price) <= 0) return setError("Precio válido.");

    setSaving(true);
    try {
      const supabase = createClient();
      let image_url: string | null = null;

      // Subir foto a Supabase Storage si la hay
      if (imageFile) {
        const slug = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const ext = imageFile.name.split(".").pop() || "png";
        const path = `productos/${slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("productos")
          .upload(path, imageFile, {
            cacheControl: "3600",
            upsert: true,
          });
        if (upErr && !upErr.message.includes("already exists")) {
          // Si el bucket no existe, mostrar mensaje útil
          if (upErr.message.toLowerCase().includes("not found") || upErr.message.toLowerCase().includes("bucket")) {
            setError(
              "Falta crear el bucket 'productos' en Supabase Storage (lo hago en el siguiente push, por ahora crea sin foto)."
            );
            setSaving(false);
            return;
          }
          throw upErr;
        }
        const { data: urlData } = supabase.storage
          .from("productos")
          .getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { error: insErr } = await supabase.from("products").insert({
        name: name.trim(),
        category,
        price: Number(price),
        description: description.trim() || null,
        image_url,
        is_public: true,
        is_active: true,
        sort_order: 99,
      });
      if (insErr) throw insErr;

      onCreated();
    } catch (e: any) {
      setError(e.message || "No se pudo crear el producto.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-cafe/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-crema rounded-t-3xl p-4 pb-8 fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xl text-cafe"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Nuevo producto
          </h2>
          <button onClick={onClose} className="text-canela">
            <IconX size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nombre" value={name} onChange={setName} />

          <div>
            <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full bg-crema-soft border border-caramelo/30 rounded-lg px-3 py-2 text-sm text-cafe focus:outline-none focus:border-cafe"
            >
              <option value="rol">Rol</option>
              <option value="berlinesa">Berlinesa</option>
              <option value="rollinbox">RollinBox</option>
              <option value="luvinbox">LuvinBox</option>
            </select>
          </div>

          <Field
            label="Precio ($)"
            value={price}
            onChange={setPrice}
          />

          <Field
            label="Descripción (voz de Masa Mía)"
            value={description}
            onChange={setDescription}
            textarea
          />

          {/* Subir foto */}
          <div>
            <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
              Foto del producto (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              className="mt-1 block w-full text-xs text-canela file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cafe file:text-crema file:text-xs file:font-bold"
            />
            {imagePreview && (
              <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-[11px] text-canela italic mt-1">
              Si no la subes ahora, puedes hacerlo después editando el producto.
            </p>
          </div>

          {error && (
            <div className="text-xs text-rojo bg-rojo/10 rounded-lg p-2">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving}
            className="w-full bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-md mt-2"
          >
            {saving ? (
              <>
                <IconLoader2 size={16} className="animate-spin" /> Creando…
              </>
            ) : (
              <>
                <IconPlus size={16} /> Crear producto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductEditForm({
  product,
  onSave,
}: {
  product: Product;
  onSave: (id: string, patch: Partial<Product>) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("La foto debe pesar menos de 4 MB.");
      return;
    }
    setUploadingImg(true);
    try {
      const supabase = createClient();
      const slug = product.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const ext = file.name.split(".").pop() || "png";
      const path = `productos/${slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("productos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("productos")
        .getPublicUrl(path);
      await onSave(product.id, { image_url: urlData.publicUrl });
    } catch (err: any) {
      alert("No se pudo subir: " + (err.message || err));
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    await onSave(product.id, {
      price: Number(price),
      description: description.trim() || null,
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="px-3 pb-3 border-t border-caramelo/20 pt-3 space-y-3">
      {/* Foto del producto */}
      <div>
        <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
          Foto del producto
        </label>
        <div className="mt-1 flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingImg}
            className="relative w-20 h-20 rounded-xl overflow-hidden bg-crema-soft border border-caramelo/30 flex items-center justify-center active:scale-95 transition disabled:opacity-50"
          >
            {uploadingImg ? (
              <IconLoader2 size={18} className="animate-spin text-canela" />
            ) : product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconCamera size={20} className="text-canela" />
            )}
          </button>
          <div className="flex-1">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              className="bg-cafe text-crema text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <IconCamera size={14} />
              {product.image_url ? "Cambiar foto" : "Subir foto"}
            </button>
            <p className="text-[11px] text-canela mt-1 italic">
              JPG/PNG, máx 4 MB. La foto cambia en el catálogo al instante.
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onUploadImage}
          className="hidden"
        />
      </div>

      <SwitchRow
        label="Visible en catálogo"
        sub="Si lo apagas, no aparece a clientes"
        value={product.is_public}
        onChange={(v) => onSave(product.id, { is_public: v })}
      />
      <SwitchRow
        label="Activo"
        sub="Si lo apagas, no se puede pedir"
        value={product.is_active}
        onChange={(v) => onSave(product.id, { is_active: v })}
      />
      <SwitchRow
        label="✨ Edición limitada"
        sub="Aparece con cinta naranja"
        value={!!product.is_limited}
        onChange={(v) => onSave(product.id, { is_limited: v })}
      />
      <SwitchRow
        label="🆕 Nuevo"
        sub="Aparece con tag verde"
        value={!!product.is_new}
        onChange={(v) => onSave(product.id, { is_new: v })}
      />

      <div>
        <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
          Precio
        </label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-cafe font-bold">$</span>
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 bg-crema-soft border border-caramelo/30 rounded-lg px-3 py-2 text-sm text-cafe focus:outline-none focus:border-cafe"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
          Descripción
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full bg-crema-soft border border-caramelo/30 rounded-lg px-3 py-2 text-xs text-cafe focus:outline-none focus:border-cafe resize-none"
          placeholder="Voz de Masa Mía…"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-antojo text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
      >
        {saving ? (
          <>
            <IconLoader2 size={14} className="animate-spin" /> Guardando…
          </>
        ) : saved ? (
          <>
            <IconCheck size={14} /> ¡Guardado!
          </>
        ) : (
          <>
            <IconDeviceFloppy size={14} /> Guardar cambios
          </>
        )}
      </button>
    </div>
  );
}

/* ===================== BOXES ===================== */

function BoxesPanel() {
  const [boxes, setBoxes] = useState<Product[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [comps, setComps] = useState<BoxComp[]>([]);
  const [opts, setOpts] = useState<CompOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: boxProducts } = await supabase
      .from("products")
      .select("*")
      .in("category", ["rollinbox", "luvinbox"])
      .order("category");
    setBoxes((boxProducts ?? []) as Product[]);
    if (boxProducts && boxProducts.length > 0 && !selectedBox) {
      setSelectedBox(boxProducts[0].id);
    }
    setLoading(false);
  };

  const loadComps = async (boxId: string) => {
    const supabase = createClient();
    const { data: c } = await supabase
      .from("box_components")
      .select("*")
      .eq("box_product_id", boxId)
      .order("sort_order");
    setComps((c ?? []) as BoxComp[]);
    if (c && c.length > 0) {
      const compIds = c.map((x) => x.id);
      const { data: o } = await supabase
        .from("component_options")
        .select("*")
        .in("component_id", compIds)
        .order("sort_order");
      setOpts((o ?? []) as CompOpt[]);
    } else {
      setOpts([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedBox) loadComps(selectedBox);
  }, [selectedBox]);

  const toggleComp = async (id: string, is_active: boolean) => {
    const supabase = createClient();
    await supabase.from("box_components").update({ is_active }).eq("id", id);
    setComps((curr) =>
      curr.map((c) => (c.id === id ? { ...c, is_active } : c))
    );
  };

  const updateCompField = async (id: string, patch: Partial<BoxComp>) => {
    const supabase = createClient();
    await supabase.from("box_components").update(patch).eq("id", id);
    setComps((curr) =>
      curr.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const deleteComp = async (id: string) => {
    if (!confirm("¿Eliminar este componente y todas sus opciones?")) return;
    const supabase = createClient();
    await supabase.from("box_components").delete().eq("id", id);
    setComps((curr) => curr.filter((c) => c.id !== id));
    setOpts((curr) => curr.filter((o) => o.component_id !== id));
  };

  const addComp = async () => {
    if (!selectedBox) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("box_components")
      .insert({
        box_product_id: selectedBox,
        name: "Componente nuevo",
        quantity: 1,
        is_active: true,
        sort_order: comps.length + 1,
      })
      .select()
      .single();
    if (error) {
      alert("No se pudo crear: " + error.message);
      return;
    }
    setComps((curr) => [...curr, data as BoxComp]);
  };

  const toggleOpt = async (id: string, is_available: boolean) => {
    const supabase = createClient();
    await supabase
      .from("component_options")
      .update({ is_available })
      .eq("id", id);
    setOpts((curr) =>
      curr.map((o) => (o.id === id ? { ...o, is_available } : o))
    );
  };

  const renameOpt = async (id: string, name: string) => {
    const supabase = createClient();
    await supabase.from("component_options").update({ name }).eq("id", id);
    setOpts((curr) => curr.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const deleteOpt = async (id: string) => {
    const supabase = createClient();
    await supabase.from("component_options").delete().eq("id", id);
    setOpts((curr) => curr.filter((o) => o.id !== id));
  };

  const addOpt = async (compId: string, name: string) => {
    if (!name.trim()) return;
    const supabase = createClient();
    const existing = opts.filter((o) => o.component_id === compId);
    const { data, error } = await supabase
      .from("component_options")
      .insert({
        component_id: compId,
        name: name.trim(),
        is_available: true,
        sort_order: existing.length + 1,
      })
      .select()
      .single();
    if (error) {
      alert("No se pudo agregar: " + error.message);
      return;
    }
    setOpts((curr) => [...curr, data as CompOpt]);
  };

  const uploadOptPhoto = async (optId: string, file: File) => {
    const supabase = createClient();
    if (file.size > 4 * 1024 * 1024) {
      alert("La foto debe pesar menos de 4 MB.");
      return;
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `opciones/${optId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("productos")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (upErr) {
      alert("No se pudo subir la foto: " + upErr.message);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("productos")
      .getPublicUrl(path);
    const image_url = urlData.publicUrl;
    await supabase
      .from("component_options")
      .update({ image_url })
      .eq("id", optId);
    setOpts((curr) =>
      curr.map((o) => (o.id === optId ? { ...o, image_url } : o))
    );
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-canela">
        <IconLoader2 size={20} className="animate-spin inline" /> Cargando…
      </div>
    );
  }

  return (
    <div>
      {/* Selector box */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {boxes.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBox(b.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedBox === b.id
                ? "bg-antojo text-white shadow"
                : "bg-white text-cafe border border-canela/30"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {comps.map((c) => {
          const componentOpts = opts.filter((o) => o.component_id === c.id);
          return (
            <ComponentCard
              key={c.id}
              comp={c}
              opts={componentOpts}
              onToggleComp={toggleComp}
              onUpdateComp={updateCompField}
              onDeleteComp={deleteComp}
              onToggleOpt={toggleOpt}
              onRenameOpt={renameOpt}
              onDeleteOpt={deleteOpt}
              onAddOpt={addOpt}
              onUploadOptPhoto={uploadOptPhoto}
            />
          );
        })}
        {comps.length === 0 && (
          <p className="text-xs text-canela italic text-center py-6">
            Esta caja no tiene componentes configurados.
          </p>
        )}
      </ul>

      {selectedBox && (
        <button
          onClick={addComp}
          className="w-full mt-4 bg-white text-cafe border-2 border-dashed border-antojo/40 rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <IconPlus size={16} /> Agregar componente al box
        </button>
      )}
    </div>
  );
}

function ComponentCard({
  comp,
  opts,
  onToggleComp,
  onUpdateComp,
  onDeleteComp,
  onToggleOpt,
  onRenameOpt,
  onDeleteOpt,
  onAddOpt,
  onUploadOptPhoto,
}: {
  comp: BoxComp;
  opts: CompOpt[];
  onToggleComp: (id: string, v: boolean) => void;
  onUpdateComp: (id: string, patch: Partial<BoxComp>) => Promise<void>;
  onDeleteComp: (id: string) => void;
  onToggleOpt: (id: string, v: boolean) => void;
  onRenameOpt: (id: string, name: string) => Promise<void>;
  onDeleteOpt: (id: string) => void;
  onAddOpt: (compId: string, name: string) => Promise<void>;
  onUploadOptPhoto: (id: string, file: File) => Promise<void>;
}) {
  const [name, setName] = useState(comp.name);
  const [qty, setQty] = useState(String(comp.quantity));
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editingOptName, setEditingOptName] = useState("");
  const [newOptName, setNewOptName] = useState("");

  useEffect(() => {
    setName(comp.name);
    setQty(String(comp.quantity));
  }, [comp.name, comp.quantity]);

  const saveCompName = () => {
    if (name.trim() && name !== comp.name) {
      onUpdateComp(comp.id, { name: name.trim() });
    }
  };

  const saveCompQty = () => {
    const n = Number(qty);
    if (n > 0 && n !== comp.quantity) {
      onUpdateComp(comp.id, { quantity: n });
    }
  };

  return (
    <li className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 space-y-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveCompName}
            className="w-full bg-transparent text-sm font-bold text-cafe focus:outline-none border-b border-transparent focus:border-cafe"
            style={{ fontFamily: "Termina" }}
          />
          <div className="flex items-center gap-2 text-[11px] text-canela">
            <span>Cantidad:</span>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={saveCompQty}
              className="w-14 bg-crema-soft border border-caramelo/30 rounded px-2 py-0.5 text-cafe focus:outline-none focus:border-cafe text-center"
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Switch
            value={comp.is_active}
            onChange={(v) => onToggleComp(comp.id, v)}
          />
          <button
            onClick={() => onDeleteComp(comp.id)}
            aria-label="Eliminar componente"
            className="text-rojo opacity-60 active:scale-90"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      {comp.is_active && (
        <div className="border-t border-caramelo/20 pt-2 space-y-2">
          <div className="text-[11px] font-bold text-canela uppercase tracking-wider">
            Opciones disponibles
          </div>

          {opts.map((o) => {
            const isEditing = editingOptId === o.id;
            return (
              <OptionRow
                key={o.id}
                option={o}
                isEditing={isEditing}
                editingName={editingOptName}
                onStartEdit={() => {
                  setEditingOptId(o.id);
                  setEditingOptName(o.name);
                }}
                onChangeEditName={setEditingOptName}
                onCommitEdit={async () => {
                  if (editingOptName.trim() && editingOptName !== o.name) {
                    await onRenameOpt(o.id, editingOptName.trim());
                  }
                  setEditingOptId(null);
                }}
                onCancelEdit={() => setEditingOptId(null)}
                onToggle={(v) => onToggleOpt(o.id, v)}
                onDelete={() => {
                  if (confirm(`¿Eliminar "${o.name}"?`)) onDeleteOpt(o.id);
                }}
                onUploadPhoto={(file) => onUploadOptPhoto(o.id, file)}
              />
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <input
              value={newOptName}
              onChange={(e) => setNewOptName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newOptName.trim()) {
                  await onAddOpt(comp.id, newOptName);
                  setNewOptName("");
                }
              }}
              placeholder="Nueva opción…"
              className="flex-1 bg-crema-soft border border-caramelo/30 rounded-lg px-2.5 py-1.5 text-xs text-cafe focus:outline-none focus:border-cafe placeholder:text-canela/60"
            />
            <button
              onClick={async () => {
                if (newOptName.trim()) {
                  await onAddOpt(comp.id, newOptName);
                  setNewOptName("");
                }
              }}
              disabled={!newOptName.trim()}
              className="w-9 h-9 rounded-lg bg-antojo text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
            >
              <IconPlus size={18} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function OptionRow({
  option,
  isEditing,
  editingName,
  onStartEdit,
  onChangeEditName,
  onCommitEdit,
  onCancelEdit,
  onToggle,
  onDelete,
  onUploadPhoto,
}: {
  option: CompOpt;
  isEditing: boolean;
  editingName: string;
  onStartEdit: () => void;
  onChangeEditName: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      await onUploadPhoto(f);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Thumbnail / botón cámara */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        aria-label={option.image_url ? "Cambiar foto" : "Subir foto"}
        className="relative w-10 h-10 rounded-lg overflow-hidden bg-crema-soft border border-caramelo/30 flex items-center justify-center flex-shrink-0 active:scale-95 transition disabled:opacity-50"
      >
        {uploading ? (
          <IconLoader2 size={14} className="animate-spin text-canela" />
        ) : option.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.image_url}
            alt={option.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <IconCamera size={16} className="text-canela" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />

      {/* Nombre editable */}
      {isEditing ? (
        <input
          autoFocus
          value={editingName}
          onChange={(e) => onChangeEditName(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") onCancelEdit();
          }}
          className="flex-1 bg-crema-soft border border-caramelo/30 rounded px-2 py-1 text-xs text-cafe focus:outline-none focus:border-cafe"
        />
      ) : (
        <button
          onClick={onStartEdit}
          className={`flex-1 text-left text-xs ${
            option.is_available ? "text-cafe" : "text-canela line-through"
          }`}
        >
          {option.name}
        </button>
      )}

      <Switch value={option.is_available} onChange={onToggle} />
      <button
        onClick={onDelete}
        aria-label="Eliminar opción"
        className="text-rojo opacity-50 active:scale-90 w-7 h-7 flex items-center justify-center"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

/* ===================== NEGOCIO ===================== */

function NegocioPanel() {
  // Defaults conocidos para keys que pueden no existir aún en la tabla settings.
  // Garantiza que aparezcan en el formulario aunque no estén en BD y se
  // inserten al guardar (vía upsert).
  const SETTING_DEFAULTS: Record<string, string> = {
    monthly_sales_goal_mxn: "8000",
    vacation_active: "off",
    vacation_from: "",
    vacation_to: "",
    vacation_message: "Estamos descansando un ratito 🥐 Volvemos pronto.",
  };

  const [settings, setSettings] = useState<Record<string, string>>(SETTING_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("settings").select("key, value");
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const row of data ?? []) map[row.key] = row.value;
    setSettings(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (k: string, v: string) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
    }));
    // Upsert por key — inserta si no existe, actualiza si sí.
    await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-canela">
        <IconLoader2 size={20} className="animate-spin inline" /> Cargando…
      </div>
    );
  }

  const vacationActive = settings.vacation_active === "on";

  return (
    <div className="space-y-4">
      {/* Modo vacaciones */}
      <Section title="🏖️ Modo vacaciones">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-bold text-cafe">Pausar pedidos</div>
            <div className="text-[11px] text-canela leading-snug mt-0.5">
              Bloquea fechas en el calendario del cliente con tu mensaje. Se
              apaga sola cuando termina el rango.
            </div>
          </div>
          <button
            onClick={() =>
              update("vacation_active", vacationActive ? "off" : "on")
            }
            className={`relative w-12 h-7 rounded-full transition flex-shrink-0 ${
              vacationActive ? "bg-antojo" : "bg-canela/40"
            }`}
            aria-label="Activar modo vacaciones"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                vacationActive ? "left-[26px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {vacationActive && (
          <div className="mt-3 space-y-3 bg-crema-soft rounded-xl p-3 border border-caramelo/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-canela uppercase tracking-wider block mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={settings.vacation_from || ""}
                  onChange={(e) => update("vacation_from", e.target.value)}
                  className="w-full bg-white border border-caramelo/40 rounded-lg px-2 py-2 text-xs text-cafe focus:outline-none focus:border-cafe"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-canela uppercase tracking-wider block mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={settings.vacation_to || ""}
                  onChange={(e) => update("vacation_to", e.target.value)}
                  className="w-full bg-white border border-caramelo/40 rounded-lg px-2 py-2 text-xs text-cafe focus:outline-none focus:border-cafe"
                />
              </div>
            </div>
            <Field
              label="Mensaje para el cliente"
              value={
                settings.vacation_message ||
                "Estamos descansando un ratito 🥐 Volvemos pronto."
              }
              onChange={(v) => update("vacation_message", v)}
              textarea
            />
            <p className="text-[11px] text-canela italic leading-relaxed">
              Tip: cuando termine la fecha de fin, el modo se apaga solo y los
              clientes vuelven a poder pedir normal.
            </p>
          </div>
        )}
      </Section>

      <Section title="📍 Dirección de recogida">
        <Field
          label="Calle y número"
          value={settings.pickup_address_line1}
          onChange={(v) => update("pickup_address_line1", v)}
        />
        <Field
          label="Colonia"
          value={settings.pickup_address_line2}
          onChange={(v) => update("pickup_address_line2", v)}
        />
        <Field
          label="Ciudad"
          value={settings.pickup_address_city}
          onChange={(v) => update("pickup_address_city", v)}
        />
        <Field
          label="Código postal"
          value={settings.pickup_address_zip}
          onChange={(v) => update("pickup_address_zip", v)}
        />
        <Field
          label="Dirección completa (lo que ve el cliente)"
          value={settings.pickup_address_full}
          onChange={(v) => update("pickup_address_full", v)}
          textarea
        />
        <Field
          label="Link de Google Maps"
          value={settings.pickup_maps_url}
          onChange={(v) => update("pickup_maps_url", v)}
        />
        <Field
          label="Nota de horario"
          value={settings.pickup_hours_note}
          onChange={(v) => update("pickup_hours_note", v)}
        />
      </Section>

      <Section title="👥 Contactos del staff">
        <Field
          label="Nombre 1"
          value={settings.contact_fabiola_name}
          onChange={(v) => update("contact_fabiola_name", v)}
        />
        <Field
          label="WhatsApp 1 (con 521)"
          value={settings.contact_fabiola_wa}
          onChange={(v) => update("contact_fabiola_wa", v)}
        />
        <Field
          label="Nombre 2"
          value={settings.contact_alex_name}
          onChange={(v) => update("contact_alex_name", v)}
        />
        <Field
          label="WhatsApp 2 (con 521)"
          value={settings.contact_alex_wa}
          onChange={(v) => update("contact_alex_wa", v)}
        />
      </Section>

      <Section title="🎯 Meta de ventas mensual">
        <Field
          label="Meta del mes (MXN)"
          value={settings.monthly_sales_goal_mxn ?? "8000"}
          onChange={(v) => update("monthly_sales_goal_mxn", v.replace(/[^0-9]/g, ""))}
        />
        <p className="text-[11px] text-canela italic leading-relaxed mt-1">
          Esta meta aparece en la pantalla de Negocio con barra de progreso.
          Recomendado: empezar bajo ($6K–$10K) los primeros 3 meses y subir
          conforme tengas datos reales. Mejor superar metas pequeñas que
          fallar metas grandes.
        </p>
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-antojo text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-md sticky bottom-4"
      >
        {saving ? (
          <>
            <IconLoader2 size={16} className="animate-spin" /> Guardando…
          </>
        ) : saved ? (
          <>
            <IconCheck size={16} /> ¡Guardado!
          </>
        ) : (
          <>
            <IconDeviceFloppy size={16} /> Guardar todo
          </>
        )}
      </button>
    </div>
  );
}

/* ===================== HELPERS ===================== */

function SwitchRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-bold text-cafe"
          style={{ fontFamily: "Termina" }}
        >
          {label}
        </div>
        {sub && <div className="text-[11px] text-canela">{sub}</div>}
      </div>
      <Switch value={value} onChange={onChange} />
    </div>
  );
}

function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition ${
        value ? "bg-verde" : "bg-canela/30"
      }`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
          value ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "antojo" | "verde";
}) {
  const cls =
    tone === "antojo"
      ? "bg-antojo/15 text-antojo"
      : tone === "verde"
      ? "bg-verde/15 text-verde"
      : "bg-canela/20 text-canela";
  return (
    <span className={`${cls} text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider`}>
      {children}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
      <h2 className="text-xs font-bold text-cafe" style={{ fontFamily: "Termina" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const v = value ?? "";
  return (
    <div>
      <label className="text-[11px] font-bold text-canela uppercase tracking-wider">
        {label}
      </label>
      {textarea ? (
        <textarea
          rows={2}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-crema-soft border border-caramelo/30 rounded-lg px-3 py-2 text-xs text-cafe focus:outline-none focus:border-cafe resize-none"
        />
      ) : (
        <input
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-crema-soft border border-caramelo/30 rounded-lg px-3 py-2 text-sm text-cafe focus:outline-none focus:border-cafe"
        />
      )}
    </div>
  );
}
