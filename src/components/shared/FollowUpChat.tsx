"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, BrainCircuit, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/store/tutorStore";

interface FollowUpChatProps {
  messages: Message[];
  isSolving?: boolean;
}

export function FollowUpChat({ messages, isSolving }: FollowUpChatProps) {
  // Filter out the main answer as it is shown in the OutputPanel
  const followUpMessages = messages.filter((m) => !m.isMainAnswer);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }

  if (followUpMessages.length === 0 && !isSolving) return null;

  return (
    <div className="flex flex-col gap-6 p-4 pt-0">
      <div className="flex items-center gap-3">
        <div className="h-px grow bg-forest/5" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/40">
          Diskusi Lanjutan
        </span>
        <div className="h-px grow bg-forest/5" />
      </div>

      <div className="flex flex-col gap-8">
        <AnimatePresence initial={false}>
          {followUpMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col gap-3 ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className={`flex items-center gap-2 mb-1 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}>
                <div className={`grid size-6 place-items-center rounded-lg ${
                  message.role === "user" 
                    ? "bg-gold/10 text-gold" 
                    : "bg-forest/5 text-forest"
                }`}>
                  {message.role === "user" ? <User size={14} /> : <BrainCircuit size={14} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-forest/40">
                  {message.role === "user" ? "Anda" : "Tutor"}
                </span>
              </div>

              <div
                className={`relative group max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-premium ${
                  message.role === "user"
                    ? "bg-white border border-gold/20 text-forest rounded-tr-none"
                    : "bg-forest/[0.02] border border-forest/5 text-[#1f2b25] rounded-tl-none"
                }`}
              >
                {message.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="absolute -top-3 -right-3 grid size-8 place-items-center rounded-xl bg-white border border-forest/10 text-forest shadow-premium opacity-0 group-hover:opacity-100 transition-all hover:bg-forest/5 active:scale-90 z-10"
                    title="Salin jawaban"
                  >
                    <AnimatePresence mode="wait">
                      {copiedId === message.id ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Check size={14} className="text-green-600" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Copy size={14} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                )}
                {message.role === "assistant" ? (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1,
                        },
                      },
                    }}
                  >
                    {message.content.split("\n").map((line, i) => (
                      <motion.p
                        key={i}
                        variants={{
                          hidden: { opacity: 0, y: 5 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as any }}
                        className={line.trim() === "" ? "h-3" : "mb-3 last:mb-0"}
                      >
                        {line}
                      </motion.p>
                    ))}
                  </motion.div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              
              <span className="text-[9px] font-bold text-forest/20 uppercase">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </motion.div>
          ))}

          {isSolving && followUpMessages.length > 0 && followUpMessages[followUpMessages.length - 1].role === "user" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 items-start"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="grid size-6 place-items-center rounded-lg bg-forest/5 text-forest">
                  <BrainCircuit size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-forest/40">
                  Tutor
                </span>
              </div>
              <div className="max-w-[85%] rounded-2xl p-4 bg-forest/[0.02] border border-forest/5 rounded-tl-none">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="size-1.5 rounded-full bg-forest/20"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
