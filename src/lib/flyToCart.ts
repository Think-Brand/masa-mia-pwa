// Fly-to-cart (Feature 4).
//
// Clona la imagen del producto y la hace "volar" hacia el carrito flotante
// (o, si aún no está montado, hacia el ícono de carrito del BottomNav).
// Solo anima transform/opacity — nunca layout. Se desactiva por completo si
// el usuario prefiere menos movimiento. No bloquea interacción y limpia el
// nodo clonado al terminar.

const REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * @param sourceEl  Elemento disparador (el botón "+"/"Agregar" tocado).
 *                  Buscamos la imagen del producto en el ancestro
 *                  `[data-fly-card]`; si no hay, usamos el propio botón.
 * @param imageUrl  URL de la foto del producto.
 */
export function flyToCart(sourceEl: HTMLElement, imageUrl: string | null) {
  if (typeof window === "undefined" || REDUCED() || !imageUrl) return;

  const card = sourceEl.closest("[data-fly-card]") as HTMLElement | null;
  const imgEl = (card?.querySelector("img") as HTMLImageElement | null) ?? null;
  const start = (imgEl ?? sourceEl).getBoundingClientRect();
  if (start.width === 0) return;

  // Destino: carrito flotante si ya existe, si no el ícono del BottomNav.
  const target =
    document.getElementById("cart-fly-target") ||
    document.getElementById("nav-cart");
  let endX: number;
  let endY: number;
  if (target) {
    const t = target.getBoundingClientRect();
    endX = t.left + t.width / 2;
    endY = t.top + t.height / 2;
  } else {
    endX = window.innerWidth / 2;
    endY = window.innerHeight - 44;
  }

  const size = Math.min(start.width, start.height, 120);
  const startX = start.left + start.width / 2;
  const startY = start.top + start.height / 2;

  const clone = document.createElement("img");
  clone.src = imageUrl;
  clone.alt = "";
  clone.setAttribute("aria-hidden", "true");
  clone.className = "fly-clone";
  clone.style.width = `${size}px`;
  clone.style.height = `${size}px`;
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.transform = `translate(${startX - size / 2}px, ${startY - size / 2}px) scale(1)`;
  clone.style.opacity = "0.95";
  document.body.appendChild(clone);

  // Fuerza un reflow para que la transición arranque desde el estado inicial.
  void clone.getBoundingClientRect();

  clone.style.transition =
    "transform 0.7s cubic-bezier(0.5, -0.25, 0.3, 1), opacity 0.7s ease-in";
  clone.style.transform = `translate(${endX - 12}px, ${endY - 12}px) scale(0.18)`;
  clone.style.opacity = "0.35";

  const cleanup = () => clone.remove();
  clone.addEventListener("transitionend", cleanup, { once: true });
  // Red de seguridad por si transitionend no dispara.
  window.setTimeout(cleanup, 900);
}
