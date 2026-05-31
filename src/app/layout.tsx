import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatePresence } from "framer-motion";

export const metadata: Metadata = {
  title: "Tanya Jawab Soal Persiapantubel",
  description: "Aplikasi Tutor Tanya Jawab Soal TPA & TBI Persiapantubel",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
