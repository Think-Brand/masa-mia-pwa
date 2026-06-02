"use client";

import { createContext, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Product } from "@/lib/types";

const DeclineNotice = dynamic(() => import("./DeclineNotice"), {
  ssr: false,
});
const StaffViewBanner = dynamic(() => import("./StaffViewBanner"), {
  ssr: false,
});

export type CompositionLine = {
  componentName: string;
  selections: Array<{ name: string; quantity: number }>;
};

export type CarritoItem = {
  // ID único en el carrito (para distinguir 2 boxes armados distinto)
  cartLineId: string;
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  prep_days?: number;
  category?: string;
  composition?: CompositionLine[];
};

export type Cliente = {
  id?: string;
  name: string;
  whatsapp: string;
  avatar_pose?: string;
  /** Formato 'MM-DD' (ej: '07-12'). null/undefined si no lo ha compartido */
  birthday?: string | null;
  /** ISO timestamp del último cambio del cumple (anti-trampa) */
  birthday_set_at?: string | null;
  /** Último año en que se aplicó el descuento de cumple */
  birthday_greeted_year?: number | null;
};

type CarritoCtx = {
  items: CarritoItem[];
  cliente: Cliente | null;
  total: number;
  count: number;
  add: (p: Product, qty?: number) => void;
  addBox: (p: Product, composition: CompositionLine[], finalPrice: number) => void;
  remove: (cartLineId: string) => void;
  setQty: (cartLineId: string, qty: number) => void;
  clear: () => void;
  setCliente: (c: Cliente | null) => void;
  /** Cantidad total de un producto simple (sin composición) en el carrito */
  getProductQty: (productId: string) => number;
  /** Disminuye en 1 la cantidad de un producto simple. Si llega a 0, elimina la línea. */
  decreaseOne: (productId: string) => void;
};

const Ctx = createContext<CarritoCtx | null>(null);

const STORAGE_KEY = "masamia:carrito";
const CLIENTE_KEY = "masamia:cliente";

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [cliente, setClienteState] = useState<Cliente | null>(null);
  const [ready, setReady] = useState(false);

  // Cargar desde localStorage al inicio
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
      const c = localStorage.getItem(CLIENTE_KEY);
      if (c) setClienteState(JSON.parse(c));
    } catch {}
    setReady(true);
  }, []);

  // Persistir al cambiar
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (cliente) localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));
      else localStorage.removeItem(CLIENTE_KEY);
    } catch {}
  }, [cliente, ready]);

  const add = (p: Product, qty = 1) => {
    setItems((curr) => {
      // Productos sin composición: si ya está, sumar quantity
      const existing = curr.find((it) => it.productId === p.id && !it.composition);
      if (existing) {
        return curr.map((it) =>
          it.cartLineId === existing.cartLineId
            ? { ...it, quantity: it.quantity + qty }
            : it
        );
      }
      return [
        ...curr,
        {
          cartLineId: `${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          price: Number(p.price),
          image_url: p.image_url,
          quantity: qty,
          prep_days: p.prep_days ?? 1,
          category: p.category,
        },
      ];
    });
  };

  const addBox = (p: Product, composition: CompositionLine[], finalPrice: number) => {
    setItems((curr) => [
      ...curr,
      {
        cartLineId: `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: p.id,
        name: p.name,
        price: finalPrice,
        image_url: p.image_url,
        quantity: 1,
        prep_days: p.prep_days ?? 1,
        category: p.category,
        composition,
      },
    ]);
  };

  const remove = (cartLineId: string) =>
    setItems((curr) => curr.filter((it) => it.cartLineId !== cartLineId));

  const setQty = (cartLineId: string, qty: number) => {
    if (qty <= 0) return remove(cartLineId);
    setItems((curr) =>
      curr.map((it) => (it.cartLineId === cartLineId ? { ...it, quantity: qty } : it))
    );
  };

  const clear = () => setItems([]);

  const getProductQty = (productId: string) => {
    const line = items.find((it) => it.productId === productId && !it.composition);
    return line?.quantity ?? 0;
  };

  const decreaseOne = (productId: string) => {
    setItems((curr) => {
      const line = curr.find((it) => it.productId === productId && !it.composition);
      if (!line) return curr;
      if (line.quantity <= 1) {
        return curr.filter((it) => it.cartLineId !== line.cartLineId);
      }
      return curr.map((it) =>
        it.cartLineId === line.cartLineId
          ? { ...it, quantity: it.quantity - 1 }
          : it
      );
    });
  };

  const setCliente = (c: Cliente | null) => setClienteState(c);

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <Ctx.Provider
      value={{
        items,
        cliente,
        total,
        count,
        add,
        addBox,
        remove,
        setQty,
        clear,
        setCliente,
        getProductQty,
        decreaseOne,
      }}
    >
      {children}
      <DeclineNoticeMount />
      <StaffViewBanner />
    </Ctx.Provider>
  );
}

function DeclineNoticeMount() {
  return <DeclineNotice />;
}

export function useCarrito() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCarrito must be used inside CarritoProvider");
  return ctx;
}
