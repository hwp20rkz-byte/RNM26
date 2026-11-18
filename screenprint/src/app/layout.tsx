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
  { href: "/plan/", label: "Бизнес-план" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <header className="border-b border-border bg-bg-elevated">
          <div className="container flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <Link href="/" className="font-display text-lg font-bold text-primary-700">
              ScreenPrint FabLab
            </Link>
            <nav className="flex flex-wrap gap-x-5 text-sm">
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
