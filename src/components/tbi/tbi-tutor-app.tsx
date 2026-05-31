"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  outputModeLabels,
  tbiQuestionTypes,
  type OutputMode,
  type TbiQuestionType,
} from "@/lib/tbi-prompt";
import { fetchTutorHistory, saveToTutorHistory, updateTutorHistory } from "@/lib/supabase";

// Decoupled Components
import { Header } from "@/components/shared/Header";
import { SettingsPanel, type ApiPreset, type AnswerQuality, type ReasoningEffort } from "@/components/shared/SettingsPanel";
import { Dropzone } from "@/components/shared/Dropzone";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { OutputPanel } from "@/components/shared/OutputPanel";
import { StickyActionPanel } from "@/components/shared/StickyActionPanel";
import { BatchReviewPanel } from "@/components/shared/BatchReviewPanel";
import { FollowUpChat } from "@/components/shared/FollowUpChat";
import { FollowUpInput } from "@/components/shared/FollowUpInput";
import type { HistoryMode, HistoryItem, CloudHistoryItem, HistoryDeleteTarget, BatchStatus, BatchItem } from "@/components/shared/types";
import { useTutorStore, type Message } from "@/store/tutorStore";

const IMAGE_MODE = "ocr";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BATCH_FILES = 20;

const sampleQuestion =
  "Tail pipes are now coated with a thin ... ceramic.\n\nA. prevent-corrosion\nB. corrosion-prevent\nC. corrosion-prevention\nD. corrosion-preventing";

const modeDescriptions: Record<OutputMode, string> = {
  standard: "Format baku single-question.",
  concise: "Kunci dan alasan inti.",
  audit: "Kroscek kunci lama.",
  docx: "Blok dokumen rapi.",
};

const batchStatusLabels: Record<BatchStatus, string> = {
  pending: "Menunggu",
  ocr: "OCR",
  review: "Perlu cek",
  running: "Diproses",
  done: "Selesai",
  failed: "Gagal",
  stopped: "Dihentikan",
};

type SolveResponse = {
  answer?: string;
  error?: string;
  model?: string;
  usage?: unknown;
  stopReason?: string | null;
  limitReached?: boolean;
};

type OcrMessage = {
  status?: string;
  progress?: number;
};

type TesseractModule = {
  recognize: (
    image: string,
    langs?: string,
    options?: {
      logger?: (message: OcrMessage) => void;
      preserve_interword_spaces?: string;
      tessedit_pageseg_mode?: string;
    },
  ) => Promise<{ data: { text: string } }>;
};

class SolveRequestError extends Error {
  status: number;
  limitReached: boolean;

  constructor(message: string, status: number, limitReached: boolean) {
    super(message);
    this.name = "SolveRequestError";
    this.status = status;
    this.limitReached = limitReached;
  }
}

function formatUsage(usage: unknown) {
  if (!usage || typeof usage !== "object") return "";
  const data = usage as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  const parts = [
    data.prompt_tokens ? `input ${data.prompt_tokens}` : "",
    data.completion_tokens ? `output ${data.completion_tokens}` : "",
    data.total_tokens ? `total ${data.total_tokens}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function buildQuestionPreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isLimitMessage(message: string) {
  return /context|token|maximum|too large|payload|413|length/i.test(message);
}

function buildBatchAnswer(items: BatchItem[]) {
  return items
    .filter((item) => ["done", "failed", "stopped"].includes(item.status))
    .map((item, index) => {
      const header = `File ${index + 1}: ${item.name}`;
      if (item.answer) {
        return `${header}\n\n${item.answer}`;
      }
      return `${header}\n\nGagal: ${item.error || "File belum selesai diproses."}`;
    })
    .join("\n\n---\n\n");
}

export function TbiTutorApp() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedHistoryRef = useRef(false);
  const [questionText, setQuestionText] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("standard");
  const [questionType, setQuestionType] = useState<TbiQuestionType>("auto");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [isTextReviewed, setIsTextReviewed] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [isBatchSolving, setIsBatchSolving] = useState(false);
  const [answer, setAnswer] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [usageText, setUsageText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cloudHistory, setCloudHistory] = useState<CloudHistoryItem[]>([]);
  const [historyMode, setHistoryMode] = useState<HistoryMode>("local");
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [cloudHistoryPage, setCloudHistoryPage] = useState(0);
  const [pendingHistoryDelete, setPendingHistoryDelete] =
    useState<HistoryDeleteTarget>(null);
  const [apiPreset, setApiPreset] = useState<ApiPreset>("deepseek");
  const [answerQuality, setAnswerQuality] =
    useState<AnswerQuality>("standard");
  const [useServerKey, setUseServerKey] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-v4-pro");
  const [useDeepSeekThinking, setUseDeepSeekThinking] = useState(true);
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("high");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1800);

  // Zustand Tutor Store
  const { 
    messages, 
    addMessage, 
    setMessages, 
    activeSessionId, 
    setSessionId, 
    clearSession 
  } = useTutorStore();

  const canSolveSingle = useMemo(
    () =>
      !isSolving &&
      !isBatchSolving &&
      !isOcrRunning &&
      questionText.trim().length > 0 &&
      (!imagePreview || isTextReviewed),
    [imagePreview, isBatchSolving, isOcrRunning, isSolving, isTextReviewed, questionText],
  );

  const canSolveBatch = useMemo(
    () =>
      !isSolving &&
      !isBatchSolving &&
      !isOcrRunning &&
      batchItems.length > 0 &&
      batchItems.every((item) => item.reviewed && item.ocrText.trim()),
    [batchItems, isBatchSolving, isOcrRunning, isSolving],
  );

  const historyTotal = history.length;
  const visibleHistoryIndex = historyTotal ? Math.min(historyPage, historyTotal - 1) : 0;
  const visibleHistoryItem = history[visibleHistoryIndex] || null;

  const cloudHistoryTotal = cloudHistory.length;
  const visibleCloudHistoryIndex = cloudHistoryTotal ? Math.min(cloudHistoryPage, cloudHistoryTotal - 1) : 0;
  const visibleCloudHistoryItem = cloudHistory[visibleCloudHistoryIndex] || null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("tbi-tutor-history");
        setHistory(stored ? (JSON.parse(stored) as HistoryItem[]) : []);
      } catch {
        setHistory([]);
      } finally {
        hasLoadedHistoryRef.current = true;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasLoadedHistoryRef.current) return;
    window.localStorage.setItem("tbi-tutor-history", JSON.stringify(history.slice(0, 8)));
  }, [history]);

  useEffect(() => {
    if (!pendingHistoryDelete) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setPendingHistoryDelete(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingHistoryDelete]);

  async function preprocessImageForOcr(imageDataUrl: string) {
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = document.createElement("img");
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageDataUrl;
      });
      const scale = Math.min(3, Math.max(2, 3200 / image.naturalWidth));
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return imageDataUrl;
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        const value = gray > 185 ? 255 : 0;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
      }
      context.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      return imageDataUrl;
    }
  }

  async function runOcrForImage(imageDataUrl: string, onProgress: (message: OcrMessage) => void) {
    const tesseract = (await import("tesseract.js")) as unknown as TesseractModule;
    const preparedImage = await preprocessImageForOcr(imageDataUrl);
    const result = await tesseract.recognize(preparedImage, "ind+eng", {
      logger: onProgress,
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "6",
    });
    return result.data.text.trim();
  }

  async function runSingleOcr(imageDataUrl: string) {
    setIsOcrRunning(true);
    setOcrStatus("Memuat OCR lokal");
    setOcrProgress(0.05);
    setIsTextReviewed(false);
    try {
      const text = await runOcrForImage(imageDataUrl, (message) => {
        if (message.status) setOcrStatus(message.status);
        if (typeof message.progress === "number") setOcrProgress(message.progress);
      });
      setQuestionText(text);
      setOcrStatus(text ? "OCR selesai. Cek teks sebelum dikirim." : "OCR tidak menemukan teks.");
      setOcrProgress(1);
    } catch (err) {
      setOcrStatus("OCR gagal");
      setError(err instanceof Error ? err.message : "OCR gagal membaca gambar.");
    } finally {
      setIsOcrRunning(false);
    }
  }

  async function runBatchOcr(items: BatchItem[]) {
    setIsOcrRunning(true);
    let workingItems = items;
    try {
      for (const item of workingItems) {
        workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: "ocr", ocrStatus: "Memuat OCR lokal", ocrProgress: 0.05 } : c);
        setBatchItems(workingItems);
        try {
          const text = await runOcrForImage(item.imageDataUrl, (message) => {
            workingItems = workingItems.map((c) => c.id === item.id ? { ...c, ocrStatus: message.status || c.ocrStatus, ocrProgress: message.progress ?? c.ocrProgress } : c);
            setBatchItems(workingItems);
          });
          workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: "review", ocrText: text, reviewed: false, ocrStatus: text ? "OCR selesai." : "OCR gagal.", ocrProgress: 1 } : c);
          setBatchItems(workingItems);
        } catch (err) {
          workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: "failed", ocrStatus: "OCR gagal", error: err instanceof Error ? err.message : "Gagal." } : c);
          setBatchItems(workingItems);
        }
      }
    } finally {
      setIsOcrRunning(false);
    }
  }

  async function handleFilesChange(fileList: FileList | File[] | null) {
    setError("");
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length > MAX_BATCH_FILES) {
      setError(`Maksimal ${MAX_BATCH_FILES} gambar per batch.`);
      return;
    }
    try {
      const items = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          });
          return {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            imageDataUrl: dataUrl,
            ocrText: "",
            reviewed: false,
            ocrStatus: "Menunggu OCR",
            ocrProgress: 0,
            status: "pending" as BatchStatus,
          };
        })
      );
      if (items.length === 1) {
        setImagePreview(items[0].imageDataUrl);
        setImageName(items[0].name);
        setBatchItems([]);
        setQuestionText("");
        setIsTextReviewed(false);
        void runSingleOcr(items[0].imageDataUrl);
      } else {
        setImagePreview(null);
        setImageName("");
        setQuestionText("");
        setBatchItems(items);
        void runBatchOcr(items);
      }
    } catch (err) {
      setError("Gagal membaca file.");
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    void handleFilesChange(event.target.files);
  }

  function handleApiPresetChange(nextPreset: ApiPreset) {
    setApiPreset(nextPreset);
    if (nextPreset === "deepseek") {
      setBaseUrl("https://api.deepseek.com");
      setModel("deepseek-v4-pro");
      setUseDeepSeekThinking(true);
    } else {
      setUseServerKey(false);
    }
  }

  function handleAnswerQualityChange(nextQuality: AnswerQuality) {
    setAnswerQuality(nextQuality);
    if (nextQuality === "standard") {
      setReasoningEffort("high");
      setMaxTokens(1800);
      setTemperature(0.2);
    } else {
      setReasoningEffort("max");
      setMaxTokens(2600);
      setTemperature(0.15);
    }
  }

  async function requestSolve(text: string, thread?: Array<{ role: "user" | "assistant"; content: string }>) {
    const response = await fetch("/api/tbi/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: text,
        messages: thread,
        imageMode: IMAGE_MODE,
        outputMode,
        questionType,
        customInstruction,
        provider: {
          apiKey: useServerKey ? "" : apiKey,
          useServerKey,
          baseUrl,
          model,
          useDeepSeekThinking,
          reasoningEffort,
          temperature,
          maxTokens,
        },
      }),
    });
    const data = (await response.json()) as SolveResponse;
    if (!response.ok || data.error) throw new SolveRequestError(data.error || "Gagal.", response.status, !!data.limitReached);
    return data;
  }

  async function solve() {
    setError("");
    setCopied(false);
    setIsSolving(true);
    clearSession();
    try {
      const text = questionText.trim();
      if (!text) {
        setError("Soal kosong.");
        return;
      }
      const data = await requestSolve(text);
      const nextAnswer = data.answer || "";
      setAnswer(nextAnswer);
      setModelUsed(data.model || model);
      setUsageText(formatUsage(data.usage));
      
      const newMsg: Message = { 
        id: crypto.randomUUID(), 
        role: "assistant", 
        content: nextAnswer, 
        timestamp: new Date().toISOString(),
        isMainAnswer: true 
      };
      setMessages([newMsg]);

      setHistory((c) => [{ id: crypto.randomUUID(), createdAt: new Date().toLocaleString("id-ID"), questionPreview: buildQuestionPreview(text), outputMode, answer: nextAnswer }, ...c]);
      setHistoryPage(0);
      
      const sid = await saveToTutorHistory({ 
        domain: "tbi", 
        questionText: text, 
        answerText: nextAnswer, 
        metadata: { outputMode, model: data.model || model, usage: data.usage } 
      });
      if (sid) setSessionId(sid.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setIsSolving(false);
    }
  }

  async function solveBatch() {
    if (!batchItems.length) return;
    setIsBatchSolving(true);
    let workingItems = batchItems.map((i) => ({ ...i, status: "pending" as BatchStatus }));
    setBatchItems(workingItems);
    try {
      for (const item of workingItems) {
        workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: "running" as BatchStatus } : c);
        setBatchItems(workingItems);
        try {
          const data = await requestSolve(item.ocrText.trim());
          const nextAnswer = data.answer || "";
          workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: data.limitReached ? "stopped" : "done", answer: nextAnswer, model: data.model || model, usageText: formatUsage(data.usage) } as any : c);
          setBatchItems(workingItems);
          setAnswer(buildBatchAnswer(workingItems));
          void saveToTutorHistory({ domain: "tbi", questionText: item.ocrText.trim(), answerText: nextAnswer, metadata: { outputMode, model: data.model || model, usage: data.usage, fileName: item.name } });
        } catch (err) {
          workingItems = workingItems.map((c) => c.id === item.id ? { ...c, status: "failed", error: err instanceof Error ? err.message : "Gagal." } as any : c);
          setBatchItems(workingItems);
        }
      }
    } finally {
      setIsBatchSolving(false);
    }
  }

  async function handleFollowUp(text: string) {
    if (!answer || isSolving) return;
    
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    
    addMessage(userMsg);
    setIsSolving(true);
    setError("");

    try {
      const thread = messages.map(m => ({ role: m.role, content: m.content }));
      thread.push({ role: "user", content: text });
      
      const data = await requestSolve("", thread);
      const tutorAnswer = data.answer || "";
      
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: tutorAnswer,
        timestamp: new Date().toISOString()
      };
      addMessage(assistantMsg);

      if (activeSessionId) {
        const followUps = messages.filter(m => !m.isMainAnswer).map(m => ({ role: m.role, content: m.content }));
        followUps.push({ role: "user", content: text });
        followUps.push({ role: "assistant", content: tutorAnswer });
        
        void updateTutorHistory(Number(activeSessionId), {
          outputMode,
          model: data.model || model,
          followUps
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pertanyaan.");
    } finally {
      setIsSolving(false);
    }
  }

  function updateBatchItem(id: string, updates: Partial<BatchItem>) {
    setBatchItems((c) => c.map((i) => i.id === id ? { ...i, ...updates } : i));
  }

  function removeBatchItem(id: string) {
    setBatchItems((c) => c.filter((i) => i.id !== id));
  }

  function clearAll() {
    setQuestionText("");
    setCustomInstruction("");
    setImagePreview(null);
    setImageName("");
    setIsTextReviewed(false);
    setBatchItems([]);
    setAnswer("");
    setError("");
    setModelUsed("");
    setUsageText("");
    clearSession();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function loadCloudHistoryData() {
    setIsFetchingHistory(true);
    try {
      const data = await fetchTutorHistory("tbi");
      setCloudHistory(data as CloudHistoryItem[]);
      setCloudHistoryPage(0);
    } finally {
      setIsFetchingHistory(false);
    }
  }

  function moveHistoryPage(direction: -1 | 1) {
    if (historyMode === "local") {
      if (!history.length) return;
      setHistoryPage((current) => Math.min(Math.max(current + direction, 0), history.length - 1));
    } else {
      if (!cloudHistory.length) return;
      setCloudHistoryPage((current) => Math.min(Math.max(current + direction, 0), cloudHistory.length - 1));
    }
  }

  function downloadAnswer() {
    if (!answer) return;
    const blob = new Blob([answer], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pembahasan-tbi.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-dvh bg-paper text-[#17201c] lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-none flex-col px-4 py-3 sm:px-6 lg:h-dvh lg:min-h-0 lg:py-4">
        <Header 
          title="Pengajar TBI"
          subtitle="Workspace Tutor Bahasa Inggris — Persiapantubel"
          switchTarget="/tpa"
          switchLabel="Ke TPA"
          onSampleClick={() => setQuestionText(sampleQuestion)}
          onSettingsToggle={() => setShowSettings(!showSettings)}
        />

        {showSettings && (
          <SettingsPanel 
            apiPreset={apiPreset} onApiPresetChange={handleApiPresetChange}
            answerQuality={answerQuality} onAnswerQualityChange={handleAnswerQualityChange}
            useServerKey={useServerKey} onUseServerKeyChange={setUseServerKey}
            apiKey={apiKey} onApiKeyChange={setApiKey}
            baseUrl={baseUrl} onBaseUrlChange={setBaseUrl}
            model={model} onModelChange={setModel}
            reasoningEffort={reasoningEffort} onReasoningEffortChange={setReasoningEffort}
            maxTokens={maxTokens} onMaxTokensChange={setMaxTokens}
            useDeepSeekThinking={useDeepSeekThinking} onUseDeepSeekThinkingChange={setUseDeepSeekThinking}
            temperature={temperature} onTemperatureChange={setTemperature}
          />
        )}

        <div className="grid flex-1 gap-6 py-2 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)] 2xl:grid-cols-[minmax(760px,1.35fr)_minmax(520px,0.9fr)]">
          <section className="flex min-h-[720px] flex-col rounded-2xl border border-forest/10 bg-white shadow-premium lg:min-h-0 lg:overflow-auto 2xl:overflow-hidden">
            <div className="shrink-0 border-b border-forest/5 bg-forest/[0.02] p-4">
              <div className="inline-flex w-full items-center gap-1 rounded-xl bg-forest/[0.05] p-1 md:w-auto">
                {(Object.keys(outputModeLabels) as OutputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOutputMode(mode)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all md:flex-none ${
                      outputMode === mode ? "bg-white text-forest shadow-premium" : "text-[#45544e] hover:bg-white/50 hover:text-forest"
                    }`}
                  >
                    {outputModeLabels[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid shrink-0 gap-3 p-3 md:grid-cols-[220px_minmax(260px,1fr)]">
              <label className="grid gap-1 text-sm font-bold text-forest">
                Tipe soal
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as TbiQuestionType)}
                  className="h-10 rounded-lg border border-forest/10 bg-white px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
                >
                  {tbiQuestionTypes.map((item) => (
                    <option key={item} value={item}>{item === "auto" ? "Auto" : item}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-1 rounded-xl border border-forest/5 bg-forest/[0.01] p-3 text-sm text-forest">
                <span className="font-bold">Mode gambar</span>
                <span className="text-xs font-medium text-[#45544e]">OCR lokal, cek teks wajib.</span>
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800 md:col-span-2">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                    <p className="font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid min-h-0 flex-1 gap-6 overflow-auto px-4 pb-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(320px,1.1fr)] 2xl:grid-cols-[minmax(360px,0.9fr)_minmax(460px,1.1fr)]">
              <label className="flex min-h-0 flex-col gap-2 text-[11px] font-black uppercase tracking-widest text-forest/60">
                Teks soal / hasil OCR
                <textarea
                  value={questionText}
                  onChange={(e) => { setQuestionText(e.target.value); setIsTextReviewed(true); }}
                  placeholder="Paste soal di sini..."
                  className="min-h-[210px] flex-1 resize-none rounded-xl border border-forest/10 bg-forest/[0.01] p-4 text-base leading-relaxed text-[#17201c] outline-none focus:border-gold focus:ring-4 focus:ring-gold/10"
                />
              </label>

              <div className="flex min-h-0 flex-col gap-2">
                <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-forest/10 bg-white px-4 text-sm font-bold text-forest transition hover:bg-forest/5 shadow-sm">
                  <Upload size={18} /> Upload Gambar
                </button>
                <Dropzone 
                  imagePreview={imagePreview} isDragActive={isDragActive} batchCount={batchItems.length}
                  fileInputRef={fileInputRef} onDropzoneClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragActive(false); void handleFilesChange(e.dataTransfer.files); }}
                  onRemoveImage={(e) => { e.stopPropagation(); setImagePreview(null); }}
                />
              </div>
            </div>

            <div className="grid gap-2 px-3 pb-3">
              <label className="grid gap-1 text-sm font-bold text-forest">
                Instruksi tambahan
                <input
                  placeholder="Opsional: misalnya bahas lebih singkat..."
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="h-11 rounded-lg border border-forest/10 bg-white px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
                />
              </label>
            </div>

            <BatchReviewPanel 
              batchItems={batchItems} batchStatusLabels={batchStatusLabels}
              onUpdateItem={updateBatchItem} onRemoveItem={removeBatchItem}
              formatFileSize={formatFileSize} instructionText="Cek hasil OCR sebelum generate."
            />

            <StickyActionPanel 
              onClearAll={clearAll} onGenerate={batchItems.length ? solveBatch : solve}
              isGenerating={isSolving || isBatchSolving} isBatch={batchItems.length > 0}
              disabled={batchItems.length ? !canSolveBatch : !canSolveSingle}
            />
          </section>

          <aside className="grid min-h-[720px] grid-rows-[minmax(0,1fr)_auto] gap-6 lg:min-h-0">
            <div className="flex min-h-0 flex-col rounded-2xl border border-forest/10 bg-white shadow-premium-lg lg:border-none lg:shadow-none 2xl:shadow-premium-lg 2xl:border-forest/10 overflow-hidden">
              <div className="flex-1 overflow-auto">
                <OutputPanel 
                  answer={answer} modelUsed={modelUsed} usageText={usageText} outputMode={outputMode}
                  copied={copied} onCopy={async () => { await navigator.clipboard.writeText(answer); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                  onDownload={downloadAnswer}
                />
                
                <FollowUpChat messages={messages} />
              </div>

              {answer && (
                <FollowUpInput 
                  onSend={handleFollowUp}
                  isGenerating={isSolving}
                  disabled={isBatchSolving}
                />
              )}
            </div>

            <HistoryPanel 
              historyMode={historyMode} onHistoryModeChange={setHistoryMode}
              historyTotal={historyTotal} visibleHistoryIndex={visibleHistoryIndex} visibleHistoryItem={visibleHistoryItem}
              cloudHistoryTotal={cloudHistoryTotal} visibleCloudHistoryIndex={visibleCloudHistoryIndex} visibleCloudHistoryItem={visibleCloudHistoryItem}
              isFetchingHistory={isFetchingHistory} onMoveHistoryPage={moveHistoryPage}
              onLoadHistoryItem={(item) => { 
                clearSession();
                setAnswer(item.answer); 
                setOutputMode(item.outputMode as any); 
                setModelUsed("Riwayat lokal"); 
                setUsageText(item.createdAt); 
                
                const mainMsg: Message = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: item.answer,
                  timestamp: new Date().toISOString(),
                  isMainAnswer: true
                };
                setMessages([mainMsg]);
              }}
              onLoadCloudHistoryItem={(item) => { 
                clearSession();
                setAnswer(item.answer_text); 
                setOutputMode(item.metadata?.outputMode as any); 
                setModelUsed(item.metadata?.model || "Riwayat cloud"); 
                setUsageText(new Date(item.created_at).toLocaleString("id-ID")); 
                setSessionId(item.id.toString());

                const thread: Message[] = [
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: item.answer_text,
                    timestamp: item.created_at,
                    isMainAnswer: true
                  }
                ];

                if (item.metadata?.followUps) {
                  item.metadata.followUps.forEach((m: any) => {
                    thread.push({
                      id: crypto.randomUUID(),
                      role: m.role,
                      content: m.content,
                      timestamp: new Date().toISOString()
                    });
                  });
                }
                setMessages(thread);
              }}
              onLoadCloudHistoryData={loadCloudHistoryData}
              onDeleteHistory={setPendingHistoryDelete}
              outputModeLabels={outputModeLabels} buildQuestionPreview={buildQuestionPreview}
            />
          </aside>
        </div>
      </div>

      {pendingHistoryDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-forest/20 backdrop-blur-sm" onClick={() => setPendingHistoryDelete(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-premium-lg">
            <div className="mb-6">
              <h3 className="text-base font-bold text-forest">{pendingHistoryDelete.kind === "all" ? "Hapus semua riwayat?" : "Hapus riwayat ini?"}</h3>
              <p className="text-sm font-medium text-[#45544e] mt-1">Tindakan ini tidak bisa dibatalkan.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPendingHistoryDelete(null)} className="flex-1 rounded-xl border border-forest/10 h-11 text-sm font-bold text-forest hover:bg-forest/5 transition">Batal</button>
              <button onClick={() => { 
                if (pendingHistoryDelete.kind === "all") { setHistory([]); setHistoryPage(0); }
                else { const next = history.filter(h => h.id !== pendingHistoryDelete.id); setHistory(next); setHistoryPage(c => Math.min(c, Math.max(next.length - 1, 0))); }
                setPendingHistoryDelete(null);
              }} className="flex-1 rounded-xl bg-red-500 h-11 text-sm font-bold text-white hover:bg-red-600 transition">Ya, Hapus</button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
