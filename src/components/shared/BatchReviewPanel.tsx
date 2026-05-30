"use client";

import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BatchStatus, BatchItem } from "./types";

interface BatchReviewPanelProps {
  batchItems: BatchItem[];
  batchStatusLabels: Record<BatchStatus, string>;
  onUpdateItem: (id: string, updates: Partial<BatchItem>) => void;
  onRemoveItem: (id: string) => void;
  formatFileSize: (bytes: number) => string;
  instructionText: string;
}

export function BatchReviewPanel({
  batchItems,
  batchStatusLabels,
  onUpdateItem,
  onRemoveItem,
  formatFileSize,
  instructionText,
}: BatchReviewPanelProps) {
  if (batchItems.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="border-t border-forest/5 bg-forest/[0.01]"
      >
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-forest">
                Review Batch ({batchItems.length} Item)
              </h2>
              <div className="text-xs font-medium text-[#225e76] bg-[#e7f0f6] px-2 py-0.5 rounded-full inline-block w-fit">
                {batchItems.filter((i) => i.reviewed).length} / {batchItems.length} Selesai
              </div>
            </div>
            <p className="hidden text-xs font-medium leading-relaxed text-[#45544e] sm:block md:max-w-md">
              {instructionText}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {batchItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border p-3 transition-all ${
                  item.reviewed
                    ? "border-green-200 bg-green-50/30"
                    : "border-forest/10 bg-white shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-lg bg-forest text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        item.status === "done"
                          ? "bg-green-100 text-green-700"
                          : item.status === "failed" || item.status === "stopped"
                            ? "bg-[#fff0ed] text-[#813126]"
                            : item.status === "ocr" || item.status === "running"
                              ? "bg-[#e7f0f6] text-[#225e76] relative overflow-hidden"
                              : "bg-white text-[#45544e]"
                      }`}
                    >
                      {batchStatusLabels[item.status]}
                      {(item.status === "ocr" || item.status === "running") && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#45544e] opacity-60">
                    {formatFileSize(item.size)}
                    {typeof item.ocrProgress === "number" && item.status === "ocr"
                      ? ` · OCR ${Math.round(item.ocrProgress * 100)}%`
                      : ""}
                    {item.usageText ? ` · ${item.usageText}` : ""}
                  </span>
                </div>

                <textarea
                  value={item.ocrText}
                  onChange={(e) =>
                    onUpdateItem(item.id, { ocrText: e.target.value })
                  }
                  placeholder="Hasil OCR..."
                  className="h-24 w-full resize-none rounded-lg border border-forest/5 bg-forest/[0.01] p-2 text-xs font-medium leading-relaxed outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/5"
                />

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.reviewed}
                      onChange={(e) =>
                        onUpdateItem(item.id, {
                          reviewed: e.target.checked,
                        })
                      }
                      className="size-4 rounded border-forest/20 text-forest focus:ring-forest/20"
                    />
                    <span className="text-xs font-bold text-forest">
                      Siap Generate
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="grid size-8 place-items-center rounded-lg text-[#45544e] transition hover:bg-red-50 hover:text-red-600"
                    title="Hapus dari batch"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {(item.ocrStatus || item.status !== "pending") && (
                    <motion.p
                      key={item.ocrStatus || item.status}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="text-[10px] font-bold text-[#45544e]"
                    >
                      {item.ocrStatus || batchStatusLabels[item.status]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
