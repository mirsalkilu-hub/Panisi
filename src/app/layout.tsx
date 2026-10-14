import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karya Widyaiswara",
  description: "Platform untuk menampilkan karya, materi ajar, dan kontribusi inspiratif para widyaiswara dalam satu ruang kolaborasi.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
