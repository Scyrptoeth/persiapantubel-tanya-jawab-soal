"use client";

import Link from "next/link";
import { 
  ArrowRightLeft, 
  BrainCircuit, 
  FileText, 
  Home, 
  Settings2 
} from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  switchTarget: "/tpa" | "/tbi";
  switchLabel: string;
  onSettingsToggle: () => void;
}

export function Header({
  title,
  subtitle,
  switchTarget,
  switchLabel,
  onSettingsToggle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex shrink-0 flex-col gap-3 rounded-xl border border-forest/5 bg-white/60 pb-3 p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-premium mb-4">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="grid size-11 place-items-center rounded-xl bg-forest text-white shadow-premium transition hover:bg-forest/90 active:scale-95"
          title="Kembali ke Beranda"
        >
          <Home size={24} aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden size-10 place-items-center rounded-xl bg-forest/5 text-forest sm:grid shadow-inner">
            <BrainCircuit size={20} aria-hidden="true" />
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
