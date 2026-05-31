"use client";

import { 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Trash2, 
} from "lucide-react";
import type { 
  HistoryItem, 
  HistoryDeleteTarget 
} from "./types";

interface HistoryPanelProps {
  historyTotal: number;
  visibleHistoryIndex: number;
  visibleHistoryItem: HistoryItem | null;
  onMoveHistoryPage: (direction: -1 | 1) => void;
  onLoadHistoryItem: (item: HistoryItem) => void;
  onDeleteHistory: (target: HistoryDeleteTarget) => void;
  outputModeLabels: Record<string, string>;
}

export function HistoryPanel({
  historyTotal,
  visibleHistoryIndex,
  visibleHistoryItem,
  onMoveHistoryPage,
  onLoadHistoryItem,
  onDeleteHistory,
  outputModeLabels,
}: HistoryPanelProps) {
  return (
    <section className="rounded-2xl border border-forest/10 bg-white shadow-premium">
      <div className="flex flex-col gap-3 border-b border-forest/5 bg-forest/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} aria-hidden="true" className="text-forest" />
            <h2 className="text-sm font-bold text-forest uppercase tracking-wider">
              Riwayat Lokal
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#45544e]">
            {historyTotal ? `${visibleHistoryIndex + 1} / ${historyTotal}` : "0 / 0"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMoveHistoryPage(-1)}
              disabled={!historyTotal || visibleHistoryIndex === 0}
              className="grid size-8 place-items-center rounded-lg border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
              aria-label="Riwayat sebelumnya"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMoveHistoryPage(1)}
              disabled={!historyTotal || visibleHistoryIndex >= historyTotal - 1}
              className="grid size-8 place-items-center rounded-lg border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
              aria-label="Riwayat berikutnya"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteHistory({ kind: "all" })}
              disabled={!historyTotal}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={13} aria-hidden="true" />
              Hapus
            </button>
          </div>
        </div>
      </div>
      <div className="p-2">
        {visibleHistoryItem ? (
          <div className="flex items-start gap-2 rounded-md bg-[#f7faf8] p-2">
            <button
              type="button"
              onClick={() => onLoadHistoryItem(visibleHistoryItem)}
              className="grid min-w-0 flex-1 gap-1 rounded-md p-2 text-left transition hover:bg-[#eef4f1]"
            >
              <span className="text-sm font-semibold text-[#27332e]">
                {outputModeLabels[visibleHistoryItem.outputMode] || "Pembahasan"}
              </span>
              <span className="text-xs leading-5 text-[#45544e]">
                {visibleHistoryItem.createdAt}
              </span>
              <span className="line-clamp-2 text-xs leading-5 text-[#45544e]">
                {visibleHistoryItem.questionPreview}
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onDeleteHistory({
                  kind: "single",
                  id: visibleHistoryItem.id,
                })
              }
              className="grid size-10 shrink-0 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#fff1ef]"
              aria-label="Hapus riwayat ini"
              title="Hapus riwayat ini"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-[#45544e]">
            <History size={24} className="mx-auto mb-2 opacity-20" />
            <p>Belum ada riwayat lokal.</p>
          </div>
        )}
      </div>
    </section>
  );
}
