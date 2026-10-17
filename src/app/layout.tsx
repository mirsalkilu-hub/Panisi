import type { Metadata } from "next";
import "./globals.css";
import { Chatbot } from "./chatbot";

export const metadata: Metadata = {
  title: "PINISI — Pusat Ilmu dan Informasi Bersinergi",
  applicationName: "PINISI",
  description: "Pusat Ilmu dan Informasi Bersinergi. Ruang berbagi karya pembelajaran, pengetahuan, dan praktik baik para kontributor.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
