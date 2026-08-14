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

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8080/api/v1";

const FALLBACK_TITLE = "Loja";
const FALLBACK_DESCRIPTION = "Loja online — catálogo, carrinho e pedidos.";

async function fetchSiteTitleAndDescription() {
  try {
    const res = await fetch(`${API}/site/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
    const data = await res.json();
    return {
      title: data.siteTitle || FALLBACK_TITLE,
      description: data.defaultDescription || FALLBACK_DESCRIPTION,
    };
  } catch {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchSiteTitleAndDescription();
  return {
    title: { template: `%s · ${site.title}`, default: site.title },
    description: site.description,
  };
}

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
