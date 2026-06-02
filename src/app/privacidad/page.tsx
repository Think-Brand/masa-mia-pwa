import Link from "next/link";
import Image from "next/image";
import { IconArrowLeft } from "@tabler/icons-react";

export const metadata = {
  title: "Aviso de privacidad — Masa Mía",
  description: "Cómo guardamos y usamos tus datos en Masa Mía.",
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-crema-soft px-5 pt-6 pb-12 max-w-md mx-auto text-cafe">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-canela mb-4 active:scale-95 transition"
      >
        <IconArrowLeft size={14} />
        Volver
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Image
          src="/mascota/miga-tierna.png"
          alt="Miga"
          width={56}
          height={56}
          className="w-14 h-14 object-contain"
        />
        <div>
          <h1
            className="text-3xl leading-none"
            style={{ fontFamily: "ReginaBlack" }}
          >
            Tu privacidad
          </h1>
          <p className="text-xs text-canela mt-1 italic">
            En cristiano, sin letra chiquita.
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4 text-sm leading-relaxed">
        <p>
          Masa Mía es una marca artesanal de roles y berlinesas operada por
          Mario Martínez en Escobedo, Nuevo León. Esta página explica qué
          datos personales recogemos cuando usas{" "}
          <b>masamia.mx</b> y para qué.
        </p>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Qué guardamos
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            <li>
              Tu <b>nombre</b> y <b>número de WhatsApp</b> cuando te das de
              alta o haces un pedido.
            </li>
            <li>
              Tu <b>email</b>, si lo proporcionas (opcional).
            </li>
            <li>
              Tu <b>cumpleaños</b> (solo mes y día, sin año), si decides
              compartirlo. El día de tu cumple te acreditamos{" "}
              <b>1 rol gratis</b> en tu próximo pedido — pasas a recogerlo
              tú o lo acuerdas por WhatsApp con Fabi o Alex. No hacemos
              envíos.
            </li>
            <li>
              El <b>historial de tus pedidos</b>: qué pediste, cuándo y
              cuánto pagaste.
            </li>
            <li>
              Notas internas que el equipo guarda sobre tus preferencias
              (ej: "le gusta sin glaseado").
            </li>
          </ul>
        </div>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Para qué los usamos
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-[13px]">
            <li>
              Procesar tu pedido y contactarte por WhatsApp si hay un
              detalle (confirmaciones, atrasos, recoger).
            </li>
            <li>
              Reconocerte cuando vuelves para no pedirte los datos otra vez.
            </li>
            <li>
              Avisarte por WhatsApp de cortesías puntuales (como tu rol de
              cumpleaños) y promos. Puedes pedirnos que dejemos de hacerlo
              cuando quieras.
            </li>
            <li>
              Mejorar el menú con datos agregados de qué se pide más.
            </li>
          </ul>
        </div>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Con quién los compartimos
          </h2>
          <p className="text-[13px]">
            Con nadie fuera de Masa Mía. Tus datos viven en una base de
            datos privada en Supabase (cifrada en reposo y en tránsito).
            No vendemos ni cedemos información a terceros. Punto.
          </p>
        </div>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Tus derechos (ARCO)
          </h2>
          <p className="text-[13px]">
            Conforme a la Ley Federal de Protección de Datos Personales en
            Posesión de los Particulares, puedes en cualquier momento:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[13px] mt-1.5">
            <li>
              <b>Acceder</b> a los datos que tenemos sobre ti.
            </li>
            <li>
              <b>Rectificar</b> los que estén incorrectos.
            </li>
            <li>
              <b>Cancelar</b> tu cuenta y todos tus datos.
            </li>
            <li>
              <b>Oponerte</b> a usos específicos (por ejemplo, dejar de
              recibir avisos).
            </li>
          </ul>
          <p className="text-[13px] mt-2">
            Para ejercerlos, escríbenos por WhatsApp a{" "}
            <a
              href="https://wa.me/5218110050755"
              target="_blank"
              rel="noreferrer"
              className="text-antojo font-bold"
            >
              Fabiola (Masa Mía)
            </a>{" "}
            o al correo{" "}
            <a
              href="mailto:hola@masamia.mx"
              className="text-antojo font-bold"
            >
              hola@masamia.mx
            </a>{" "}
            indicando &quot;Borrar mi cuenta&quot; o lo que necesites.
            Atendemos en menos de 7 días.
          </p>
        </div>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Cookies y rastreo
          </h2>
          <p className="text-[13px]">
            Usamos almacenamiento local del navegador (localStorage) para
            recordarte entre visitas. No usamos cookies de publicidad, ni
            pixeles de Facebook/Google, ni vendemos tu navegación a nadie.
          </p>
        </div>

        <div>
          <h2
            className="text-xs font-bold uppercase tracking-widest text-canela mb-1.5"
            style={{ fontFamily: "Termina" }}
          >
            Cambios a este aviso
          </h2>
          <p className="text-[13px]">
            Si actualizamos esta política, lo verás reflejado aquí con su
            fecha. La versión vigente es la que esté publicada en este
            sitio.
          </p>
        </div>

        <p className="text-[11px] text-canela italic pt-2 border-t border-canela/10">
          Última actualización: 2 de junio de 2026 · Responsable: Mario
          Martínez · Masa Mía, Escobedo, Nuevo León, México.
        </p>
      </section>

      <p className="text-[11px] text-canela text-center mt-5 italic">
        Si todavía tienes dudas, Miga insiste: pregúntanos por WhatsApp y
        te responde una persona, no un bot.
      </p>
    </main>
  );
}
