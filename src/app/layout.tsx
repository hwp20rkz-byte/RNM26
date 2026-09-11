import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UiPrefsProvider } from "@/components/UiPrefsProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QazaqOSI — Тарифный калькулятор сметы ОСИ / ПТ",
  description:
    "Интерактивный калькулятор сметы расходов на управление и содержание объекта кондоминиума по Методике МИИР РК №166.",
};

// Применяет сохранённые настройки интерфейса (тема/масштаб/плотность/язык)
// к <html> синхронно, до первой отрисовки — иначе страница на долю секунды
// мигнёт светлой темой/дефолтным масштабом, даже если пользователь выбрал
// тёмную/крупный шрифт. Источник истины для useUiPrefsStore (см. store) —
// значения совпадают, здесь просто более ранний, синхронный путь применения.
const THEME_INIT_SCRIPT = `(function(){try{
  var raw = localStorage.getItem("qazaqosi-ui-prefs-v1");
  var s = raw ? (JSON.parse(raw).state || {}) : {};
  var theme = s.theme || "system";
  var dark = theme === "dark" || (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-font-scale", s.fontScale || "md");
  root.setAttribute("data-icon-scale", s.iconScale || "md");
  root.setAttribute("data-density", s.density || "comfortable");
  var locale = s.locale || "ru";
  root.setAttribute("lang", locale === "kz" ? "kk" : locale === "en" ? "en" : "ru");
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950">
        <UiPrefsProvider />
        {children}
      </body>
    </html>
  );
}
