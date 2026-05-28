"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/types";

export type CarritoItem = {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

export type Cliente = {
  id?: string;
  name: string;
  whatsapp: string;
};

type CarritoCtx = {
  items: CarritoItem[];
  cliente: Cliente | null;
  total: number;
  count: number;
  add: (p: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  setCliente: (c: Cliente) => void;
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
      const existing = curr.find((it) => it.productId === p.id);
      if (existing) {
        return curr.map((it) =>
          it.productId === p.id ? { ...it, quantity: it.quantity + qty } : it
        );
      }
      return [
        ...curr,
        {
          productId: p.id,
          name: p.name,
          price: Number(p.price),
          image_url: p.image_url,
          quantity: qty,
        },
      ];
    });
  };

  const remove = (productId: string) =>
    setItems((curr) => curr.filter((it) => it.productId !== productId));

  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) return remove(productId);
    setItems((curr) =>
      curr.map((it) => (it.productId === productId ? { ...it, quantity: qty } : it))
    );
  };

  const clear = () => setItems([]);

  const setCliente = (c: Cliente) => setClienteState(c);

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <Ctx.Provider
      value={{ items, cliente, total, count, add, remove, setQty, clear, setCliente }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCarrito must be used inside CarritoProvider");
  return ctx;
}
