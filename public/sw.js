/* Masa Mía — Service Worker para Web Push (cocina staff).
 *
 * Responsabilidades:
 *  - Recibir push events del servidor (Edge Function).
 *  - Mostrar notificación nativa con título, body, ícono y data.
 *  - Al tap, abrir/enfocar la app en la ruta indicada por `data.url`.
 *
 * NO maneja caché offline en esta versión — se puede agregar después.
 */

self.addEventListener("install", (event) => {
  // Activar inmediatamente sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control de los clientes existentes inmediatamente.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Masa Mía", body: event.data.text() };
  }

  const {
    title = "Masa Mía",
    body = "",
    url = "/staff/cocina",
    tag,
    badge = "/icons/icon-192.png",
    icon = "/icons/icon-192.png",
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag, // si llega otro push con mismo tag, se reemplaza (no se acumulan)
    data: { url },
    vibrate: [200, 80, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/staff/cocina";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Si ya hay una pestaña abierta del staff, enfocarla y navegar.
      for (const client of allClients) {
        if (client.url.includes("/staff") && "focus" in client) {
          await client.navigate(target);
          return client.focus();
        }
      }

      // Si no, abrir una nueva.
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })()
  );
});
