"use client";

import { KeyRound, Settings2 } from "lucide-react";
import { useState } from "react";
import { StorageManager } from "./StorageManager";
import type { HistoryItem } from "./types";

export type ApiPreset = "deepseek" | "custom";
export type AnswerQuality = "standard" | "thorough";
export type ReasoningEffort = "high" | "max";

interface SettingsPanelProps {
  apiPreset: ApiPreset;
  onApiPresetChange: (nextPreset: ApiPreset) => void;
  answerQuality: AnswerQuality;
  onAnswerQualityChange: (nextQuality: AnswerQuality) => void;
  useServerKey: boolean;
  onUseServerKeyChange: (useServer: boolean) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  // Advanced settings
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  reasoningEffort: ReasoningEffort;
  onReasoningEffortChange: (effort: ReasoningEffort) => void;
  maxTokens: number;
  onMaxTokensChange: (tokens: number) => void;
  useDeepSeekThinking: boolean;
  onUseDeepSeekThinkingChange: (useThinking: boolean) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  // Storage
  historyKey: string;
  onImportSuccess: (data: HistoryItem[]) => void;
}

export function SettingsPanel({
  apiPreset,
  onApiPresetChange,
  answerQuality,
  onAnswerQualityChange,
  useServerKey,
  onUseServerKeyChange,
  apiKey,
  onApiKeyChange,
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  reasoningEffort,
  onReasoningEffortChange,
  maxTokens,
  onMaxTokensChange,
  useDeepSeekThinking,
  onUseDeepSeekThinkingChange,
  temperature,
  onTemperatureChange,
  historyKey,
  onImportSuccess,
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="mt-4 rounded-xl border border-forest/10 bg-white p-6 shadow-premium">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-base font-bold text-forest">
          Pengaturan AI
        </h2>
        <p className="text-sm text-[#45544e]">
          Pilih layanan AI dan kunci akses yang dipakai untuk membuat
          pembahasan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-forest">
          AI Model
          <select
            value={apiPreset}
            onChange={(event) =>
              onApiPresetChange(event.target.value as ApiPreset)
            }
            className="h-11 rounded-lg border border-forest/10 bg-forest/[0.02] px-3 text-sm font-medium outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
          >
            <option value="deepseek">DeepSeek V4 Pro</option>
          </select>
          <span className="text-[11px] font-medium leading-5 text-[#45544e] opacity-70">
            Website hanya mengirim teks final ke DeepSeek API.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-bold text-forest">
          Kualitas Jawaban
          <select
            value={answerQuality}
            onChange={(event) =>
              onAnswerQualityChange(event.target.value as AnswerQuality)
            }
            className="h-11 rounded-lg border border-forest/10 bg-forest/[0.02] px-3 text-sm font-medium outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
          >
            <option value="standard">Standar, cepat, dan ringkas</option>
            <option value="thorough">Lebih teliti untuk soal sulit</option>
          </select>
          <span className="text-[11px] font-medium leading-5 text-[#45544e] opacity-70">
            Gunakan Standar untuk mayoritas soal. Pilih Lebih teliti saat
            soal panjang atau rumit.
          </span>
        </label>
      </div>

      <div className="mt-8 space-y-6 border-t border-forest/5 pt-8">
        <div className="flex rounded-xl bg-forest/5 p-1">
          <button
            type="button"
            onClick={() => onUseServerKeyChange(true)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-left transition ${
              useServerKey
                ? "bg-white text-forest shadow-premium"
                : "text-[#45544e] hover:text-forest"
            }`}
          >
            <span className="block text-sm font-bold">
              Pakai kunci yang sudah tersimpan
            </span>
            <span className="block text-[11px] font-medium leading-5 opacity-70">
              Pilihan paling mudah untuk komputer ini.
            </span>
          </button>
          <button
            type="button"
            onClick={() => onUseServerKeyChange(false)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-left transition ${
              !useServerKey
                ? "bg-white text-forest shadow-premium"
                : "text-[#45544e] hover:text-forest"
            }`}
          >
            <span className="block text-sm font-bold">
              Masukkan kunci baru
            </span>
            <span className="block text-[11px] font-medium leading-5 opacity-70">
              Pakai ini jika ingin mencoba kunci DeepSeek lain.
            </span>
          </button>
        </div>

        <label className="grid gap-2 text-sm font-bold text-forest">
          Kunci API
          <div className="relative">
            <KeyRound
              size={16}
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#45544e]"
            />
            <input
              type="password"
              value={apiKey}
              disabled={useServerKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder={
                useServerKey
                  ? "Sudah dikonfigurasi (Kunci Server)"
                  : "Tempel kunci API di sini"
              }
              className="h-12 w-full rounded-lg border border-forest/10 bg-forest/[0.02] px-11 text-sm font-medium outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10 disabled:opacity-50"
            />
          </div>
          <span className="text-[11px] font-medium leading-5 text-[#45544e] opacity-70">
            Kunci baru hanya dipakai untuk permintaan ini dan tidak
            disimpan di riwayat.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-forest/10 bg-white px-4 py-2 text-xs font-bold text-forest shadow-sm transition hover:bg-forest/5 active:scale-95"
        >
          <Settings2 size={14} />
          {showAdvanced ? "Sembunyikan pengaturan lanjutan" : "Tampilkan pengaturan lanjutan"}
        </button>

        {showAdvanced && (
          <div className="grid gap-4 rounded-xl border border-forest/5 bg-forest/[0.01] p-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-forest/60">
              Alamat layanan
              <input
                value={baseUrl}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                className="h-10 rounded-lg border border-forest/10 bg-white px-3 font-mono text-xs outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-forest/60">
              Nama model
              <input
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="h-10 rounded-lg border border-forest/10 bg-white px-3 font-mono text-xs outline-none focus:border-gold"
              />
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-forest/60">
              Ketelitian mesin
              <select
                value={reasoningEffort}
                onChange={(e) => onReasoningEffortChange(e.target.value as ReasoningEffort)}
                className="h-10 rounded-lg border border-forest/10 bg-white px-3 text-xs outline-none focus:border-gold"
              >
                <option value="high">Tinggi</option>
                <option value="max">Maksimal</option>
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-forest/60">
              Panjang jawaban
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => onMaxTokensChange(Number(e.target.value))}
                className="h-10 rounded-lg border border-forest/10 bg-white px-3 text-xs outline-none focus:border-gold"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-forest/5 bg-white px-3 text-[11px] font-bold text-forest lg:col-span-2">
              <input
                type="checkbox"
                checked={useDeepSeekThinking}
                onChange={(e) => onUseDeepSeekThinkingChange(e.target.checked)}
                className="size-4 rounded border-forest/20 text-forest focus:ring-forest/20"
              />
              Aktifkan mode berpikir mendalam (DeepSeek)
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-forest/60 lg:col-span-2">
              Kreativitas (Temperature)
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                value={temperature}
                onChange={(e) => onTemperatureChange(Number(e.target.value))}
                className="h-10 rounded-lg border border-forest/10 bg-white px-3 text-xs outline-none focus:border-gold"
              />
            </label>
          </div>
        )}
      </div>

      <StorageManager 
        historyKey={historyKey} 
        onImportSuccess={onImportSuccess} 
      />
    </section>
  );
}
