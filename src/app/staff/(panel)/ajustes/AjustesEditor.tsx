"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  IconBox,
  IconBuildingStore,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircleDot,
  IconDeviceFloppy,
  IconEdit,
  IconLoader2,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

type Tab = "productos" | "boxes" | "negocio";

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
      </div>

      {tab === "productos" && <ProductosPanel />}
      {tab === "boxes" && <BoxesPanel />}
      {tab === "negocio" && <NegocioPanel />}
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
                <div className="text-[10px] text-canela capitalize">
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
        <label className="text-[10px] font-bold text-canela uppercase tracking-wider">
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
        <label className="text-[10px] font-bold text-canela uppercase tracking-wider">
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
            <li key={c.id} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div
                    className="text-sm font-bold text-cafe"
                    style={{ fontFamily: "Termina" }}
                  >
                    {c.name}
                  </div>
                  <div className="text-[10px] text-canela">
                    × {c.quantity} unidades
                  </div>
                </div>
                <Switch
                  value={c.is_active}
                  onChange={(v) => toggleComp(c.id, v)}
                />
              </div>

              {c.is_active && componentOpts.length > 0 && (
                <div className="border-t border-caramelo/20 pt-2 space-y-2">
                  <div className="text-[10px] font-bold text-canela uppercase tracking-wider">
                    Opciones disponibles
                  </div>
                  {componentOpts.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className={`text-xs ${
                          o.is_available ? "text-cafe" : "text-canela line-through"
                        }`}
                      >
                        {o.name}
                      </span>
                      <Switch
                        value={o.is_available}
                        onChange={(v) => toggleOpt(o.id, v)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {c.is_active && componentOpts.length === 0 && (
                <div className="text-[10px] text-canela italic border-t border-caramelo/20 pt-2">
                  Sin opciones cargadas. Se incluye por default.
                </div>
              )}
            </li>
          );
        })}
        {comps.length === 0 && (
          <p className="text-xs text-canela italic text-center py-6">
            Esta caja no tiene componentes configurados.
          </p>
        )}
      </ul>
    </div>
  );
}

/* ===================== NEGOCIO ===================== */

function NegocioPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("settings").select("key, value");
    const map: Record<string, string> = {};
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
    for (const row of rows) {
      await supabase.from("settings").update({ value: row.value }).eq("key", row.key);
    }
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

  return (
    <div className="space-y-4">
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
        {sub && <div className="text-[10px] text-canela">{sub}</div>}
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
    <span className={`${cls} text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider`}>
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
      <label className="text-[10px] font-bold text-canela uppercase tracking-wider">
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
