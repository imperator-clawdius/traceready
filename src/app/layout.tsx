import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://traceready.online"),
  title: "TraceReady",
  description:
    "Clean and validate messy farm CSV, KML, and GeoJSON files into buyer-ready coffee and cocoa handoff packs.",
  openGraph: {
    title: "TraceReady",
    description:
      "Clean and validate messy farm CSV, KML, and GeoJSON files into buyer-ready coffee and cocoa handoff packs.",
    url: "https://traceready.online",
    siteName: "TraceReady",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
