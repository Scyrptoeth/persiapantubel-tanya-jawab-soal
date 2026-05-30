"use client";

import { Eraser, Loader2, Send } from "lucide-react";

interface StickyActionPanelProps {
  onClearAll: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isBatch: boolean;
  disabled: boolean;
}

export function StickyActionPanel({
  onClearAll,
  onGenerate,
  isGenerating,
  isBatch,
  disabled,
}: StickyActionPanelProps) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-forest/10 bg-white/80 p-4 backdrop-blur-lg">
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-forest/10 bg-white px-5 text-sm font-bold text-forest transition hover:bg-forest/5 active:scale-95"
      >
        <Eraser size={18} aria-hidden="true" />
        Bersihkan
      </button>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-3 rounded-xl bg-gold px-6 text-sm font-black text-black shadow-premium transition hover:bg-gold/90 hover:shadow-premium-lg disabled:cursor-not-allowed disabled:bg-gold/40 disabled:text-black/40 disabled:shadow-none active:scale-95"
      >
        {isGenerating ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={18} aria-hidden="true" />
        )}
        {isBatch ? "Generate batch" : "Generate"}
      </button>
    </div>
  );
}
