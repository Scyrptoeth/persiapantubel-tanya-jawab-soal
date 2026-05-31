"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRightLeft, 
  Settings2 
} from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  switchTarget: "/tpa" | "/tbi";
  switchLabel: string;
  onSettingsToggle: () => void;
  logo?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  switchTarget,
  switchLabel,
  onSettingsToggle,
  logo,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex shrink-0 flex-col gap-3 rounded-xl border border-forest/5 bg-white/60 pb-3 p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-premium mb-4">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="relative size-11 overflow-hidden rounded-xl bg-white border border-forest/10 shadow-premium transition hover:shadow-premium-lg active:scale-95 flex items-center justify-center p-1.5"
          title="Kembali ke Beranda"
        >
          <Image 
            src="/favicon.png" 
            alt="Persiapantubel" 
            width={32} 
            height={32} 
            className="object-contain"
          />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden size-10 items-center justify-center rounded-xl bg-forest/5 p-1 sm:flex shadow-inner">
            {logo ? logo : (
              <Image 
                src="/favicon.png" 
                alt="Logo" 
                width={24} 
                height={24} 
                className="object-contain opacity-80"
              />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-forest">
              {title}
            </h1>
            <p className="text-xs font-medium leading-5 text-[#45544e]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href={switchTarget}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-forest/10 bg-forest/5 px-4 text-sm font-semibold text-forest shadow-sm transition hover:bg-forest/10 active:scale-95"
          title={`Pindah ke ${switchLabel}`}
        >
          <ArrowRightLeft size={18} aria-hidden="true" />
          {switchLabel}
        </Link>
        <button
          type="button"
          onClick={onSettingsToggle}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#c8d0cb] bg-white px-4 text-sm font-semibold text-[#27332e] shadow-sm transition hover:bg-[#f8faf9] active:scale-95"
        >
          <Settings2 size={18} aria-hidden="true" />
          API
        </button>
      </div>
    </header>
  );
}
