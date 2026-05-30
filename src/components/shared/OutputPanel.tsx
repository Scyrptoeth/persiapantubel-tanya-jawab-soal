"use client";

import { Check, Clipboard, Copy, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OutputPanelProps {
  answer: string;
  modelUsed: string;
  usageText: string;
  outputMode: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export function OutputPanel({
  answer,
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
            {modelUsed ? `${modelUsed}${usageText ? ` · ${usageText}` : ""}` : "Belum ada hasil"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!answer}
            onClick={onCopy}
            className="grid size-10 place-items-center rounded-xl border border-forest/10 bg-white text-forest transition hover:bg-forest/5 disabled:opacity-30 active:scale-95 shadow-sm"
            aria-label="Copy output"
            title="Copy output"
          >
            {copied ? (
              <Check size={18} className="text-green-600" />
            ) : (
              <Copy size={18} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            disabled={!answer}
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
          {answer ? (
            <motion.div
              key={answer}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as any }}
            >
              <pre
                className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1f2b25] ${
                  outputMode === "docx"
                    ? "font-premium-serif text-lg leading-loose"
                    : "font-sans"
                }`}
              >
                {answer}
              </pre>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
