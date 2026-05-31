"use client";

import { Check, Clipboard, Copy, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonLoader } from "./SkeletonLoader";

interface OutputPanelProps {
  answer: string;
  isSolving: boolean;
  modelUsed: string;
  usageText: string;
  outputMode: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export function OutputPanel({
  answer,
  isSolving,
  modelUsed,
  usageText,
  outputMode,
  copied,
  onCopy,
  onDownload,
}: OutputPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-forest/10 bg-white shadow-premium-lg lg:border-none lg:shadow-none 2xl:shadow-premium-lg 2xl:border-forest/10">
      <div className="flex items-center justify-between gap-3 border-b border-[#e1e6e2] p-3">
        <div>
          <h2 className="text-base font-bold text-forest">Output</h2>
          <p className="text-xs font-medium text-[#45544e]">
            {isSolving ? "Menganalisa..." : (modelUsed ? `${modelUsed}${usageText ? ` · ${usageText}` : ""}` : "Belum ada hasil")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!answer || isSolving}
            onClick={onCopy}
            className="grid size-10 place-items-center rounded-xl border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:opacity-30 active:scale-95 shadow-sm"
            aria-label="Copy output"
            title="Copy output"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Check size={18} className="text-green-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Copy size={18} aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            type="button"
            disabled={!answer || isSolving}
            onClick={onDownload}
            className="grid size-10 place-items-center rounded-xl border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:opacity-30 active:scale-95 shadow-sm"
            aria-label="Download output"
            title="Download output"
          >
            <Download size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
        <AnimatePresence mode="wait">
          {isSolving ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <SkeletonLoader />
            </motion.div>
          ) : answer ? (
            <motion.div
              key={answer}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1f2b25] ${
                outputMode === "docx"
                  ? "font-premium-serif text-lg leading-loose"
                  : "font-sans"
              }`}
            >
              {answer.split("\n").map((line, i) => (
                <motion.p
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 5 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as any }}
                  className={line.trim() === "" ? "h-4" : "mb-4 last:mb-0"}
                >
                  {line}
                </motion.p>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid h-full min-h-0 place-items-center rounded-2xl border border-dashed border-forest/10 bg-forest/[0.01] p-8 text-center text-sm text-[#45544e]"
            >
              <div className="grid justify-items-center gap-4">
                <div className="grid size-16 place-items-center rounded-2xl bg-white text-forest shadow-premium">
                  <Clipboard size={32} aria-hidden="true" />
                </div>
                <div className="grid gap-1">
                  <span className="font-bold text-forest uppercase tracking-wider">
                    Siap Menganalisa
                  </span>
                  <p className="max-w-[200px] text-xs leading-5 text-[#45544e] opacity-70">
                    Hasil pembahasan premium Anda akan muncul di sini.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
