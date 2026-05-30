"use client";

import OnboardingTour, { TourStep } from "./OnboardingTour";
import { STAFF_TOUR_ID } from "@/lib/onboarding";

const STAFF_STEPS: TourStep[] = [
  {
    image: "miga-adorable.png",
    title: "¡Bienvenida al horno!",
    body: "Soy Miga. Este es tu cuartel.\nTe muestro rapidito qué hace cada parte para que no te pierdas en la masa.",
  },
  {
    image: "miga-senalar.png",
    title: "Pedidos",
    body: "Aquí caen los antojos. Cuando entre uno nuevo, suena la campanita.\n\nPícale para ver el detalle, aceptarlo o declinar si no llegas.",
  },
  {
    image: "miga-malabares.png",
    title: "Cocina",
    body: "Tu pantalla de batalla. Cards gigantes con cada pedido en curso.\n\nMete al horno, marca listo, entrega. Todo con dedos enharinados.",
  },
  {
    image: "miga-cintura.png",
    title: "Datos",
    body: "Cuánto vendiste, qué sabor se pidió más, quién es tu cliente del mes.\n\nPara celebrar (o ajustar) con números.",
  },
  {
    image: "miga-algo-entre-manos.png",
    title: "Ajustes",
    body: "El centro de control: productos, opciones de boxes, precios, dirección, y el modo piloto.\n\nListo, ya conoces la cocina. Cuando termine el piloto, esto deja de aparecer.",
  },
];

type Props = {
  forceShow?: boolean;
  onClose?: () => void;
};

export default function StaffOnboarding({ forceShow, onClose }: Props) {
  return (
    <OnboardingTour
      tourId={STAFF_TOUR_ID}
      steps={STAFF_STEPS}
      forceShow={forceShow}
      onClose={onClose}
    />
  );
}
