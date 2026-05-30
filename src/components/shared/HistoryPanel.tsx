"use client";

import { 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Loader2, 
  Trash2, 
  Upload, 
  X 
} from "lucide-react";
import type { 
  HistoryMode, 
  HistoryItem, 
  CloudHistoryItem, 
  HistoryDeleteTarget 
} from "./types";

interface HistoryPanelProps {
  historyMode: HistoryMode;
  onHistoryModeChange: (mode: HistoryMode) => void;
  historyTotal: number;
  visibleHistoryIndex: number;
  visibleHistoryItem: HistoryItem | null;
  cloudHistoryTotal: number;
  visibleCloudHistoryIndex: number;
  visibleCloudHistoryItem: CloudHistoryItem | null;
  isFetchingHistory: boolean;
  onMoveHistoryPage: (direction: -1 | 1) => void;
  onLoadHistoryItem: (item: HistoryItem) => void;
  onLoadCloudHistoryItem: (item: CloudHistoryItem) => void;
  onLoadCloudHistoryData: () => void;
  onDeleteHistory: (target: HistoryDeleteTarget) => void;
  outputModeLabels: Record<string, string>;
  buildQuestionPreview: (text: string) => string;
}

export function HistoryPanel({
  historyMode,
  onHistoryModeChange,
  historyTotal,
  visibleHistoryIndex,
  visibleHistoryItem,
  cloudHistoryTotal,
  visibleCloudHistoryIndex,
  visibleCloudHistoryItem,
  isFetchingHistory,
  onMoveHistoryPage,
  onLoadHistoryItem,
  onLoadCloudHistoryItem,
  onLoadCloudHistoryData,
  onDeleteHistory,
  outputModeLabels,
  buildQuestionPreview,
}: HistoryPanelProps) {
  return (
    <section className="rounded-2xl border border-forest/10 bg-white shadow-premium">
      <div className="flex flex-col gap-3 border-b border-forest/5 bg-forest/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} aria-hidden="true" className="text-forest" />
            <h2 className="text-sm font-bold text-forest">
              {historyMode === "local" ? "RIWAYAT LOKAL" : "RIWAYAT CLOUD"}
            </h2>
          </div>
          <div className="flex rounded-lg bg-forest/5 p-1">
            <button
              type="button"
              onClick={() => onHistoryModeChange("local")}
              className={`rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                historyMode === "local"
                  ? "bg-white text-forest shadow-premium"
                  : "text-[#45544e] hover:text-forest"
              }`}
            >
              Lokal
            </button>
            <button
              type="button"
              onClick={() => onHistoryModeChange("cloud")}
              className={`rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                historyMode === "cloud"
                  ? "bg-white text-forest shadow-premium"
                  : "text-[#45544e] hover:text-forest"
              }`}
            >
              Cloud
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#45544e]">
            {historyMode === "local" ? (
              historyTotal ? `${visibleHistoryIndex + 1} / ${historyTotal}` : "0 / 0"
            ) : (
              cloudHistoryTotal ? `${visibleCloudHistoryIndex + 1} / ${cloudHistoryTotal}` : "0 / 0"
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMoveHistoryPage(-1)}
              disabled={
                (historyMode === "local" && (!historyTotal || visibleHistoryIndex === 0)) ||
                (historyMode === "cloud" && (!cloudHistoryTotal || visibleCloudHistoryIndex === 0))
              }
              className="grid size-8 place-items-center rounded-lg border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
              aria-label="Riwayat sebelumnya"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMoveHistoryPage(1)}
              disabled={
                (historyMode === "local" && (!historyTotal || visibleHistoryIndex >= historyTotal - 1)) ||
                (historyMode === "cloud" && (!cloudHistoryTotal || visibleCloudHistoryIndex >= cloudHistoryTotal - 1))
              }
              className="grid size-8 place-items-center rounded-lg border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
              aria-label="Riwayat berikutnya"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            {historyMode === "local" ? (
              <button
                type="button"
                onClick={() => onDeleteHistory({ kind: "all" })}
                disabled={!historyTotal}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={13} aria-hidden="true" />
                Hapus
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadCloudHistoryData}
                disabled={isFetchingHistory}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-forest/10 bg-white px-2.5 text-[10px] font-black uppercase text-forest transition hover:bg-forest/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isFetchingHistory ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-2">
        {historyMode === "local" ? (
          visibleHistoryItem ? (
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
          )
        ) : (
          visibleCloudHistoryItem ? (
            <div className="flex items-start gap-2 rounded-md bg-[#f7faf8] p-2">
              <button
                type="button"
                onClick={() => onLoadCloudHistoryItem(visibleCloudHistoryItem)}
                className="grid min-w-0 flex-1 gap-1 rounded-md p-2 text-left transition hover:bg-[#eef4f1]"
              >
                <span className="text-sm font-semibold text-[#27332e]">
                  {visibleCloudHistoryItem.metadata?.outputMode
                    ? outputModeLabels[visibleCloudHistoryItem.metadata.outputMode]
                    : "Pembahasan"}
                </span>
                <span className="text-xs leading-5 text-[#45544e]">
                  {new Date(visibleCloudHistoryItem.created_at).toLocaleString("id-ID")}
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-[#45544e]">
                  {buildQuestionPreview(visibleCloudHistoryItem.question_text)}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid place-items-center py-8 text-center text-xs text-[#45544e]">
              {isFetchingHistory ? (
                <>
                  <Loader2 size={24} className="mb-2 animate-spin opacity-40" />
                  <p>Mengambil data dari cloud...</p>
                </>
              ) : (
                <>
                  <History size={24} className="mx-auto mb-2 opacity-20" />
                  <p>Belum ada riwayat cloud.</p>
                  <button
                    onClick={onLoadCloudHistoryData}
                    className="mt-2 text-[#3b82f6] hover:underline"
                  >
                    Muat ulang
                  </button>
                </>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
}
