/**
 * Web Push helpers para el staff.
 *
 * Flujo:
 *  1. registerServiceWorker() — registra /sw.js (idempotente).
 *  2. checkPushSupport() — true si el navegador + dispositivo soporta.
 *  3. subscribeToPush() — pide permiso, crea subscripción y la guarda en DB.
 *  4. unsubscribeFromPush() — opt-out limpio para este dispositivo.
 *  5. isSubscribed() — saber si este dispositivo ya está suscrito.
 *
 * iOS Safari: solo funciona si la PWA está instalada (Add to Home Screen)
 * desde iOS 16.4+. En navegador normal devuelve false.
 */

import { createClient } from "@/lib/supabase";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  // Fallback al valor generado para masamia.mx
  "BNn1M9a9UA97FGgP9C9BJMuVRJpfSKadrbBeMBpxk1jsf_mQ63yIRgJXal9d8E37dWOqW40FiROH1wyS7xYTbBo";

/**
 * Convierte un VAPID key base64-url a Uint8Array (formato que pide pushManager).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detecta si este navegador/dispositivo puede manejar Web Push.
 * En iOS solo es true cuando la PWA está instalada (standalone).
 */
export function checkPushSupport(): {
  supported: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { supported: false, reason: "ssr" };
  }
  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "Tu navegador no soporta service workers." };
  }
  if (!("PushManager" in window)) {
    return { supported: false, reason: "Tu navegador no soporta Web Push." };
  }
  if (!("Notification" in window)) {
    return { supported: false, reason: "Tu navegador no soporta notificaciones." };
  }

  // iOS: requiere PWA instalada.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS-specific
    window.navigator.standalone === true;

  if (isIOS && !isStandalone) {
    return {
      supported: false,
      reason:
        'En iPhone tienes que instalar la app primero: Compartir → "Agregar a pantalla de inicio". Después abre desde el ícono.',
    };
  }

  return { supported: true };
}

/**
 * Registra el service worker si no está ya registrado.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // Esperar a que esté activo.
  if (reg.active) return reg;
  await new Promise<void>((resolve) => {
    const worker = reg.installing || reg.waiting;
    if (!worker) return resolve();
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
    });
  });
  return reg;
}

/**
 * Saber si este dispositivo ya tiene una suscripción activa.
 */
export async function isSubscribed(): Promise<boolean> {
  const support = checkPushSupport();
  if (!support.supported) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/**
 * Suscribir este dispositivo a push notifications.
 * - Pide permiso
 * - Crea subscripción con VAPID
 * - Upserta en push_subscriptions (linkeado al usuario logueado)
 */
export async function subscribeToPush(): Promise<
  | { ok: true }
  | { ok: false; reason: string }
> {
  const support = checkPushSupport();
  if (!support.supported) {
    return { ok: false, reason: support.reason ?? "No soportado" };
  }

  // Pedir permiso explícito.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Permiso denegado." };
  }

  const reg = await registerServiceWorker();

  // Crear o reusar suscripción.
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast a BufferSource — TS estricto se queja del Uint8Array<ArrayBufferLike>
      // pero el runtime acepta Uint8Array sin problema.
      applicationServerKey: urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY
      ) as unknown as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "Suscripción sin claves válidas." };
  }

  // Guardar en Supabase, linkeado al usuario actual.
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, reason: "Inicia sesión primero." };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userData.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
        enabled: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("Error guardando suscripción:", error);
    return { ok: false, reason: "No se pudo guardar la suscripción." };
  }

  return { ok: true };
}

/**
 * Desuscribir este dispositivo.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return true;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    // Borrar de DB.
    const supabase = createClient();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

    return true;
  } catch (err) {
    console.error("Error al desuscribir:", err);
    return false;
  }
}
