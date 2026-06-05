// Helpers de enlace a la ficha de un producto. Mantiene una sola definición
// de slug/URL para grid, hero y carrusel.

import { Product } from "./types";

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isBox(p: Pick<Product, "category">) {
  return p.category === "rollinbox" || p.category === "luvinbox";
}

/** URL de la ficha: /box/... para cajas armables, /producto/... para simples. */
export function productHref(p: Product) {
  const slug = slugify(p.name);
  return isBox(p)
    ? `/box/${slug}?id=${p.id}`
    : `/producto/${slug}?id=${p.id}`;
}
