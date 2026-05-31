import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: 'swap',
});

import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatePresence } from "framer-motion";

export const metadata: Metadata = {
  metadataBase: new URL("https://persiapantubel-tanya-jawab-soal.vercel.app"),
  title: "Tanya Jawab Soal Persiapantubel",
  description: "Aplikasi Tutor Tanya Jawab Soal TPA & TBI Persiapantubel",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Tanya Jawab Soal Persiapantubel",
    description: "Asisten AI Tutor TPA & TBI untuk persiapan masuk sekolah kedinasan.",
    url: "https://persiapantubel-tanya-jawab-soal.vercel.app",
    siteName: "Persiapantubel",
    images: [
      {
        url: "/logo.png",
        width: 1256,
        height: 658,
        alt: "Logo Persiapantubel",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tanya Jawab Soal Persiapantubel",
    description: "Asisten AI Tutor TPA & TBI untuk persiapan masuk sekolah kedinasan.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
