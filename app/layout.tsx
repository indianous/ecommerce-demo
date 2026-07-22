import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProviders } from "@/components/layout/RootProviders";
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
  title: "Loja",
  description: "Loja online — catálogo, carrinho e pedidos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
