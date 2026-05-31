"use client";

import { Send, Loader2 } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

interface FollowUpInputProps {
  onSend: (text: string) => void;
  isGenerating: boolean;
  disabled: boolean;
}

export function FollowUpInput({ onSend, isGenerating, disabled }: FollowUpInputProps) {
  const [text, setText] = useState("");

  function handleSend() {
    if (text.trim() && !isGenerating && !disabled) {
      onSend(text.trim());
      setText("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-forest/5 bg-white/80 p-4 backdrop-blur-xl">
      <div className="relative flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan detail atau minta penjelasan lebih dalam..."
          rows={1}
          className="max-h-32 w-full resize-none rounded-xl border border-forest/10 bg-forest/[0.01] p-3 pr-14 text-sm leading-relaxed text-[#17201c] outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/5 disabled:opacity-50"
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${target.scrollHeight}px`;
          }}
          disabled={disabled || isGenerating}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isGenerating || disabled}
          className="absolute bottom-1.5 right-1.5 grid size-10 place-items-center rounded-lg bg-gold text-black shadow-premium transition hover:bg-gold/90 disabled:opacity-30 active:scale-95"
          aria-label="Kirim pertanyaan"
        >
          {isGenerating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
