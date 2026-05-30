"use client";

import OnboardingTour, { TourStep } from "./OnboardingTour";
import { CLIENTE_TOUR_ID } from "@/lib/onboarding";

const CLIENTE_STEPS: TourStep[] = [
  {
    image: "miga-adorable.png",
    title: "¡Qué gusto verte!",
    body: "Soy Miga, tu cómplice de antojos.\nAntes de soltarte por el menú, te muestro cómo armar tu pedido en 3 pasos.",
  },
  {
    image: "miga-senalar.png",
    title: "Escoge",
    body: "Roles, RollinBox, berlinesas o LuvinBox.\n\nPica una para verla de cerca o suma con el +.\nSi no sabes qué pedir, dale al ¡Antójame! y yo te recomiendo.",
  },
  {
    image: "miga-algo-entre-manos.png",
    title: "Arma tu carrito",
    body: "Todo lo que sumas aparece en el botón del carrito, abajo.\n\nAhí decides cantidad, forma de pago y cuándo lo recoges.",
  },
  {
    image: "miga-lista.png",
    title: "Confirma y te avisamos",
    body: "Mandas tu pedido por WhatsApp. Fabi o Alex te confirman cuando entre al horno.\n\nPasas por tu antojo y… ¡buen provecho!",
  },
];

type Props = {
  forceShow?: boolean;
  onClose?: () => void;
};

export default function ClienteOnboarding({ forceShow, onClose }: Props) {
  return (
    <OnboardingTour
      tourId={CLIENTE_TOUR_ID}
      steps={CLIENTE_STEPS}
      forceShow={forceShow}
      onClose={onClose}
    />
  );
}
