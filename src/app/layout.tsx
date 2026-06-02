import type { Metadata, Viewport } from "next";
import { CarritoProvider } from "@/components/CarritoProvider";
import { ToastProvider } from "@/components/Toast";
import Splash from "@/components/Splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masa Mía — Postres & Antojos",
  description:
    "Roles, berlinesas y antojos artesanales. Horneado fresco, hecho con cariño.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Masa Mía",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/icons/favicon-32.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3A271D",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale ni userScalable: false — permitir zoom es requisito
  // de accesibilidad (WCAG 1.4.4) y evita bounce de usuarios con dificultad
  // visual.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <CarritoProvider>
          <ToastProvider>{children}</ToastProvider>
        </CarritoProvider>
        <Splash />
      </body>
    </html>
  );
}
