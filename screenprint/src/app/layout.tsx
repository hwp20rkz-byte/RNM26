import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScreenPrint FabLab",
  description: "Станки для шелкографии из фанеры и профиля, 3D-конфигуратор, конструктор мерча и CRM цеха",
};

const NAV = [
  { href: "/", label: "Обзор" },
  { href: "/press/", label: "Печатный станок" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <header className="border-b border-border bg-bg-elevated">
          <div className="container flex min-h-16 items-center justify-between gap-4">
            <Link href="/" className="font-display text-lg font-bold text-primary-700">
              ScreenPrint FabLab
            </Link>
            <nav className="flex gap-6 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="min-h-11 inline-flex items-center text-fg-muted hover:text-fg">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container py-12">{children}</main>
      </body>
    </html>
  );
}
