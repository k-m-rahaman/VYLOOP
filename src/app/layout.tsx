import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "VYLOOP — Your life, leveled up",
  description:
    "Build better habits, master your money, and turn small steps into your next big thing. Your Life. Your Levels. Your Rules.",
  icons: { icon: `${basePath}/icon.svg`, apple: `${basePath}/icon.svg` },
  manifest: `${basePath}/manifest.webmanifest`,
};

const localFonts = {
  "--font-inter": '"Segoe UI", Arial, sans-serif',
  "--font-space": '"Segoe UI", Arial, sans-serif',
} as CSSProperties;

const themeScript = `(function(){try{var t=localStorage.getItem('vyloop-theme')||'dark';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={localFonts}>{children}</body>
    </html>
  );
}
