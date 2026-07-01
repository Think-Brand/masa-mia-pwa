import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Masa Mía
        cafe: "#3A271D",
        canela: "#6E4933",
        "canela-soft": "#9A6B4A",
        caramelo: "#AC7B54",
        crema: "#F4E5CF",
        "crema-soft": "#FBF4E6",
        "avellana-soft": "#F5E8CE",
        // Acento de pedido
        antojo: "#F25C20",
        "antojo-dark": "#C2440B",
        "antojo-darker": "#E04A18",
        // Dorado (avisos, destellos, confetti)
        oro: "#F2A516",
        // Acción aceptar
        verde: "#5B7A3A",
        // Acción declinar
        rojo: "#C0392B",
      },
      fontFamily: {
        regina: ["ReginaBlack", "serif"],
        termina: ["Termina", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
