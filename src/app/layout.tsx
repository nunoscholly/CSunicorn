// Root-Layout: Setzt globale Styles, Schriftart und Metadaten für die gesamte App

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "START CREW",
  description: "Echtzeit-Koordination für die Start Summit Build Week",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
