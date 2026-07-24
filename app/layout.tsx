import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGR-EG",
  description: "Sistema de Gestión de Riesgos Empresariales Globales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
