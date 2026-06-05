"use client";

import { useEffect, useState } from "react";
import { IconBell, IconBellOff, IconLoader2, IconCheck } from "@tabler/icons-react";
import {
  checkPushSupport,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";

/**
 * Tarjeta de Ajustes que permite a cada usuario del staff (Mario, Faby, Alex)
 * activar las notificaciones push EN ESTE DISPOSITIVO específico.
 *
 * En iPhone solo funciona si la PWA está instalada desde Safari → Compartir →
 * "Agregar a pantalla de inicio". Si no, mostramos instrucción.
 */
export default function PushNotificationsCard() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [support, setSupport] = useState<{
    supported: boolean;
    reason?: string;
  } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const s = checkPushSupport();
    setSupport(s);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    isSubscribed().then(setSubscribed);
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await subscribeToPush();
    if (result.ok) {
      setSubscribed(true);
      setPermission("granted");
      setFeedback("✓ Listo. Te llegarán notificaciones de pedidos nuevos.");
    } else {
      setFeedback("No se pudo activar: " + result.reason);
    }
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    const ok = await unsubscribeFromPush();
    if (ok) {
      setSubscribed(false);
      setFeedback("Notificaciones desactivadas en este dispositivo.");
    } else {
      setFeedback("No se pudo desactivar — intenta de nuevo.");
    }
    setLoading(false);
  };

  // Estado: soporte no disponible (no es PWA instalada en iOS, etc.)
  if (support && !support.supported) {
    return (
      <div className="bg-crema-soft border border-caramelo/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <IconBellOff size={20} className="text-canela flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div
              className="font-bold text-cafe mb-1"
              style={{ fontFamily: "Termina" }}
            >
              Notificaciones push
            </div>
            <p className="text-xs text-canela leading-relaxed">
              {support.reason}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: permission denied (el usuario lo bloqueó manualmente)
  if (permission === "denied" && !subscribed) {
    return (
      <div className="bg-rojo/5 border border-rojo/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <IconBellOff size={20} className="text-rojo flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div
              className="font-bold text-cafe mb-1"
              style={{ fontFamily: "Termina" }}
            >
              Notificaciones bloqueadas
            </div>
            <p className="text-xs text-canela leading-relaxed">
              Bloqueaste las notificaciones en este dispositivo. Para activarlas:
              Ajustes del sistema → Notificaciones → Masa Mía → Permitir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subscribed === true;

  return (
    <div
      className={`rounded-xl p-4 border ${
        isActive
          ? "bg-verde/5 border-verde/30"
          : "bg-crema-soft border-caramelo/30"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        {isActive ? (
          <IconBell size={20} className="text-verde flex-shrink-0 mt-0.5" />
        ) : (
          <IconBellOff size={20} className="text-canela flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-cafe mb-1"
            style={{ fontFamily: "Termina" }}
          >
            Notificaciones push
          </div>
          <p className="text-xs text-canela leading-relaxed">
            {isActive
              ? "Activadas en este dispositivo. Te avisamos al instante cuando entre un pedido nuevo, aunque no tengas la app abierta."
              : "Te avisamos en cuanto entre un pedido nuevo, sin tener que abrir la app. Cada dispositivo (iPhone, iPad) lo activas por separado."}
          </p>
        </div>
      </div>

      <button
        onClick={isActive ? handleUnsubscribe : handleSubscribe}
        disabled={loading || subscribed === null}
        className={`w-full rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 ${
          isActive
            ? "bg-white border border-canela/40 text-cafe"
            : "bg-antojo text-white"
        }`}
        style={{ fontFamily: "Termina" }}
      >
        {loading ? (
          <IconLoader2 size={16} className="animate-spin" />
        ) : isActive ? (
          <>
            <IconBellOff size={16} /> Desactivar en este dispositivo
          </>
        ) : (
          <>
            <IconBell size={16} /> Activar notificaciones
          </>
        )}
      </button>

      {feedback && (
        <p
          className={`text-[11px] mt-2 leading-relaxed ${
            feedback.startsWith("✓") ? "text-verde" : "text-canela"
          }`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
