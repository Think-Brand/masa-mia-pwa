import type { Metadata, Viewport } from "next";
import { CarritoProvider } from "@/components/CarritoProvider";
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
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3A271D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <CarritoProvider>{children}</CarritoProvider>
      </body>
    </html>
  );
}
