import type { Metadata } from "next";
import "@fontsource-variable/geist/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЛСТК Планировщик",
  description: "Параметрическая генерация профилей ЛСТК и ферм: геометрия, раскрой, отверстия под крепёж.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
