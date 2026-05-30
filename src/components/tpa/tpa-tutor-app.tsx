"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  Eraser,
  FileText,
  History,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Send,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  outputModeLabels,
  tpaDomains,
  type OutputMode,
  type TpaDomain,
} from "@/lib/tpa-prompt";
import { fetchTutorHistory, saveToTutorHistory } from "@/lib/supabase";

type ImageMode = "ocr" | "vision";
type ReasoningEffort = "high" | "max";
type ApiPreset = "deepseek" | "custom";
type AnswerQuality = "standard" | "thorough";
type HistoryMode = "local" | "cloud";
type BatchStatus =
  | "pending"
  | "ocr"
  | "review"
  | "running"
  | "done"
  | "failed"
  | "stopped";

type HistoryItem = {
  id: string;
  createdAt: string;
  questionPreview: string;
  outputMode: OutputMode;
  answer: string;
};

type CloudHistoryItem = {
  id: number;
  created_at: string;
  question_text: string;
  answer_text: string;
  domain: string;
  metadata?: {
    outputMode?: OutputMode;
    model?: string;
  };
};

type HistoryDeleteTarget =
  | { kind: "single"; id: string }
  | { kind: "all" }
  | null;

type BatchItem = {
  id: string;
  name: string;
  size: number;
  imageDataUrl: string;
  ocrText: string;
  reviewed: boolean;
  ocrStatus?: string;
  ocrProgress?: number;
  status: BatchStatus;
  answer?: string;
  error?: string;
  model?: string;
  usageText?: string;
  stopReason?: string;
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

const IMAGE_MODE: ImageMode = "ocr";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BATCH_FILES = 20;

const sampleQuestion =
  "Soal 31\nJarak kota C dan D adalah 115 km. Charly berangkat dari kota C ke kota D pada pukul 06.20 mengendarai sepeda motor dengan kecepatan 40 km/jam. Dimas berangkat dari kota D ke kota C pada pukul 07.05 mengendarai mobil dengan kecepatan 60 km/jam. Pada pukul berapakah Charly dan Dimas berpapasan?\n\nA. 07.12\nB. 07.23\nC. 07.34\nD. 07.45\nE. 07.56";

const modeDescriptions: Record<OutputMode, string> = {
  student: "Ringkas, siap ditempel.",
  concise: "Kunci dan alasan inti.",
  audit: "Status, koreksi, confidence.",
  docx: "Blok pembahasan rapi.",
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
    .filter((item) =>
      ["done", "failed", "stopped"].includes(item.status),
    )
    .map((item, index) => {
      const header = `File ${index + 1}: ${item.name}`;

      if (item.answer) {
        return `${header}\n\n${item.answer}`;
      }

      return `${header}\n\nGagal: ${item.error || "File belum selesai diproses."}`;
    })
    .join("\n\n---\n\n");
}

export function TpaTutorApp() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedHistoryRef = useRef(false);
  const [questionText, setQuestionText] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("student");
  const [domain, setDomain] = useState<TpaDomain>("auto");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [isTextReviewed, setIsTextReviewed] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchStopMessage, setBatchStopMessage] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [isBatchSolving, setIsBatchSolving] = useState(false);
  const [answer, setAnswer] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [usageText, setUsageText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedApi, setShowAdvancedApi] = useState(false);
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

  const canSolveSingle = useMemo(
    () =>
      !isSolving &&
      !isBatchSolving &&
      !isOcrRunning &&
      questionText.trim().length > 0 &&
      (!imagePreview || isTextReviewed),
    [
      imagePreview,
      isBatchSolving,
      isOcrRunning,
      isSolving,
      isTextReviewed,
      questionText,
    ],
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
  const visibleHistoryIndex = historyTotal
    ? Math.min(historyPage, historyTotal - 1)
    : 0;
  const visibleHistoryItem = history[visibleHistoryIndex] || null;

  const cloudHistoryTotal = cloudHistory.length;
  const visibleCloudHistoryIndex = cloudHistoryTotal
    ? Math.min(cloudHistoryPage, cloudHistoryTotal - 1)
    : 0;
  const visibleCloudHistoryItem = cloudHistory[visibleCloudHistoryIndex] || null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("tpa-tutor-history");
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

    window.localStorage.setItem(
      "tpa-tutor-history",
      JSON.stringify(history.slice(0, 8)),
    );
  }, [history]);

  useEffect(() => {
    if (!pendingHistoryDelete) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPendingHistoryDelete(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingHistoryDelete]);

  function validateImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return `${file.name} bukan file gambar.`;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return `${file.name} berukuran ${formatFileSize(
        file.size,
      )}. Batas aman OCR lokal adalah 8 MB per file.`;
    }

    return "";
  }

  function readImageDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`${file.name} gagal dibaca.`));
      reader.readAsDataURL(file);
    });
  }

  function loadImageForOcr(imageDataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = document.createElement("img");
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gambar gagal diproses untuk OCR."));
      image.src = imageDataUrl;
    });
  }

  async function preprocessImageForOcr(imageDataUrl: string) {
    try {
      const image = await loadImageForOcr(imageDataUrl);
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
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const gray =
          pixels[index] * 0.299 +
          pixels[index + 1] * 0.587 +
          pixels[index + 2] * 0.114;
        const value = gray > 185 ? 255 : 0;
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
      }

      context.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      return imageDataUrl;
    }
  }

  async function runOcrForImage(
    imageDataUrl: string,
    onProgress: (message: OcrMessage) => void,
  ) {
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
        if (typeof message.progress === "number") {
          setOcrProgress(message.progress);
        }
      });

      setQuestionText(text);
      setOcrStatus(text ? "OCR selesai. Cek teks sebelum dikirim." : "OCR tidak menemukan teks.");
      setOcrProgress(1);
      if (!text) {
        setError("OCR tidak menemukan teks yang bisa dibaca. Ketik soal secara manual dari gambar.");
      }
    } catch (ocrError) {
      setOcrStatus("OCR gagal");
      setError(
        ocrError instanceof Error
          ? ocrError.message
          : "OCR gagal membaca gambar.",
      );
    } finally {
      setIsOcrRunning(false);
    }
  }

  async function runBatchOcr(items: BatchItem[]) {
    setIsOcrRunning(true);
    setBatchStopMessage("");

    let workingItems = items;

    try {
      for (const item of workingItems) {
        workingItems = workingItems.map((current) =>
          current.id === item.id
            ? {
                ...current,
                status: "ocr" as BatchStatus,
                ocrStatus: "Memuat OCR lokal",
                ocrProgress: 0.05,
              }
            : current,
        );
        setBatchItems(workingItems);

        try {
          const text = await runOcrForImage(item.imageDataUrl, (message) => {
            workingItems = workingItems.map((current) =>
              current.id === item.id
                ? {
                    ...current,
                    ocrStatus: message.status || current.ocrStatus,
                    ocrProgress:
                      typeof message.progress === "number"
                        ? message.progress
                        : current.ocrProgress,
                  }
                : current,
            );
            setBatchItems(workingItems);
          });

          workingItems = workingItems.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status: "review" as BatchStatus,
                  ocrText: text,
                  reviewed: false,
                  ocrStatus: text
                    ? "OCR selesai. Cek teks."
                    : "OCR tidak menemukan teks.",
                  ocrProgress: 1,
                  error: text ? "" : "Ketik soal manual dari gambar ini.",
                }
              : current,
          );
          setBatchItems(workingItems);
        } catch (ocrError) {
          workingItems = workingItems.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status: "failed" as BatchStatus,
                  reviewed: false,
                  ocrStatus: "OCR gagal",
                  error:
                    ocrError instanceof Error
                      ? ocrError.message
                      : "OCR gagal membaca gambar.",
                }
              : current,
          );
          setBatchItems(workingItems);
        }
      }
    } finally {
      setIsOcrRunning(false);
    }
  }

  async function handleFilesChange(fileList: FileList | File[] | null) {
    setError("");
    setBatchStopMessage("");

    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (files.length > MAX_BATCH_FILES) {
      setError(`Maksimal ${MAX_BATCH_FILES} gambar per batch.`);
      return;
    }

    const firstInvalid = files.map(validateImageFile).find(Boolean);
    if (firstInvalid) {
      setError(firstInvalid);
      return;
    }

    try {
      const items = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          imageDataUrl: await readImageDataUrl(file),
          ocrText: "",
          reviewed: false,
          ocrStatus: "Menunggu OCR",
          ocrProgress: 0,
          status: "pending" as BatchStatus,
        })),
      );

      if (items.length === 1) {
        setImagePreview(items[0].imageDataUrl);
        setImageName(items[0].name);
        setBatchItems([]);
        setQuestionText("");
        setIsTextReviewed(false);
        setAnswer("");
        setModelUsed("");
        setUsageText("");
        void runSingleOcr(items[0].imageDataUrl);
        return;
      }

      setImagePreview(null);
      setImageName("");
      setQuestionText("");
      setIsTextReviewed(false);
      setBatchItems(items);
      setAnswer("");
      setModelUsed("Batch gambar");
      setUsageText(`${items.length} file menunggu OCR`);
      void runBatchOcr(items);
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Gambar gagal dibaca.",
      );
    }
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    void handleFilesChange(event.dataTransfer.files);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleApiPresetChange(nextPreset: ApiPreset) {
    setApiPreset(nextPreset);

    if (nextPreset === "deepseek") {
      setBaseUrl("https://api.deepseek.com");
      setModel("deepseek-v4-pro");
      setUseDeepSeekThinking(true);
    } else {
      setShowAdvancedApi(true);
      setUseServerKey(false);
    }
  }

  function handleAnswerQualityChange(nextQuality: AnswerQuality) {
    setAnswerQuality(nextQuality);

    if (nextQuality === "standard") {
      setReasoningEffort("high");
      setMaxTokens(1800);
      setTemperature(0.2);
      return;
    }

    setReasoningEffort("max");
    setMaxTokens(2600);
    setTemperature(0.15);
  }

  async function requestSolve(input: {
    questionText: string;
  }) {
    const response = await fetch("/api/tpa/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: input.questionText,
        imageDataUrl: null,
        imageMode: IMAGE_MODE,
        outputMode,
        domain,
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

    if (!response.ok || data.error) {
      throw new SolveRequestError(
        data.error || `Request gagal dengan HTTP ${response.status}.`,
        response.status,
        Boolean(data.limitReached),
      );
    }

    return data;
  }

  async function solve() {
    setError("");
    setBatchStopMessage("");
    setCopied(false);
    setIsSolving(true);

    try {
      const textForSolve = questionText.trim();

      if (!textForSolve && !imagePreview) {
        setError("Isi soal belum ada. Paste teks soal atau upload gambar untuk OCR lokal.");
        return;
      }

      if (!textForSolve) {
        setError("Hasil OCR masih kosong. Cek gambar, lalu isi teks soal secara manual.");
        return;
      }

      if (imagePreview && !isTextReviewed) {
        setError("Cek hasil OCR dulu, lalu centang bahwa teks sudah sesuai sebelum dikirim ke DeepSeek.");
        return;
      }

      const data = await requestSolve({
        questionText: textForSolve,
      });

      const nextAnswer = data.answer || "";
      setAnswer(nextAnswer);
      setModelUsed(data.model || model);
      setUsageText(formatUsage(data.usage));
      if (data.limitReached) {
        setError(
          "Provider berhenti karena batas token atau context. Hasil yang tampil mungkin belum lengkap.",
        );
      }
      setHistory((current) => [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString("id-ID"),
          questionPreview: buildQuestionPreview(
            textForSolve || imageName || "Gambar visual",
          ),
          outputMode,
          answer: nextAnswer,
        },
        ...current,
      ]);
      setHistoryPage(0);

      // Persist to Supabase for efficiency (text only)
      void saveToTutorHistory({
        domain: "tpa",
        questionText: textForSolve,
        answerText: nextAnswer,
        metadata: {
          outputMode,
          model: data.model || model,
          usage: data.usage
        }
      });
    } catch (solveError) {
      setError(
        solveError instanceof Error
          ? solveError.message
          : "Gagal membuat pembahasan.",
      );
    } finally {
      setIsSolving(false);
    }
  }

  async function solveBatch() {
    if (!batchItems.length) return;

    setError("");
    setBatchStopMessage("");
    setCopied(false);
    setIsBatchSolving(true);

    let workingItems = batchItems.map((item) => ({
      ...item,
      status: "pending" as BatchStatus,
      answer: "",
      error: "",
      model: "",
      usageText: "",
      stopReason: "",
    }));

    const firstUnreviewed = workingItems.find(
      (item) => !item.reviewed || !item.ocrText.trim(),
    );
    if (firstUnreviewed) {
      setError(
        `Cek dan tandai hasil OCR untuk ${firstUnreviewed.name} sebelum menjalankan batch.`,
      );
      setIsBatchSolving(false);
      return;
    }

    setBatchItems(workingItems);
    setAnswer("");
    setModelUsed("Batch gambar");
    setUsageText(`0/${workingItems.length} selesai`);

    try {
      for (const item of workingItems) {
        workingItems = workingItems.map((current) =>
          current.id === item.id
            ? { ...current, status: "running" as BatchStatus }
            : current,
        );
        setBatchItems(workingItems);

        try {
          const data = await requestSolve({
            questionText: item.ocrText.trim(),
          });
          const nextAnswer = data.answer || "";

          workingItems = workingItems.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status: data.limitReached
                    ? ("stopped" as BatchStatus)
                    : ("done" as BatchStatus),
                  answer: nextAnswer,
                  model: data.model || model,
                  usageText: formatUsage(data.usage),
                  stopReason: data.stopReason || "",
                }
              : current,
          );
          setBatchItems(workingItems);
          setAnswer(buildBatchAnswer(workingItems));

          if (nextAnswer) {
            setHistory((current) => [
              {
                id: crypto.randomUUID(),
                createdAt: new Date().toLocaleString("id-ID"),
                questionPreview: item.name,
                outputMode,
                answer: nextAnswer,
              },
              ...current,
            ]);
            setHistoryPage(0);

            // Persist to Supabase for efficiency (text only)
            void saveToTutorHistory({
              domain: "tpa",
              questionText: item.ocrText.trim(),
              answerText: nextAnswer,
              metadata: {
                outputMode,
                model: data.model || model,
                usage: data.usage,
                fileName: item.name
              }
            });
          }

          const doneCount = workingItems.filter(
            (current) => current.status === "done",
          ).length;
          setUsageText(`${doneCount}/${workingItems.length} selesai`);

          if (data.limitReached) {
            setBatchStopMessage(
              `Batch dihentikan di ${item.name} karena provider mencapai batas token atau context.`,
            );
            break;
          }
        } catch (itemError) {
          const message =
            itemError instanceof Error
              ? itemError.message
              : "File gagal diproses.";
          const limitReached =
            itemError instanceof SolveRequestError
              ? itemError.limitReached || isLimitMessage(message)
              : isLimitMessage(message);
          const shouldStop =
            limitReached ||
            (itemError instanceof SolveRequestError &&
              [400, 401, 403, 413].includes(itemError.status));

          workingItems = workingItems.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status: shouldStop
                    ? ("stopped" as BatchStatus)
                    : ("failed" as BatchStatus),
                  error: message,
                }
              : current,
          );
          setBatchItems(workingItems);
          setAnswer(buildBatchAnswer(workingItems));

          if (shouldStop) {
            setBatchStopMessage(
              limitReached
                ? `Batch dihentikan di ${item.name} karena batas token, context, atau ukuran payload tercapai.`
                : `Batch dihentikan di ${item.name}: ${message}`,
            );
            break;
          }
        }
      }
    } finally {
      setIsBatchSolving(false);
    }
  }

  function updateBatchOcrText(itemId: string, nextText: string) {
    setBatchItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, ocrText: nextText, reviewed: false, status: "review" }
          : item,
      ),
    );
  }

  function updateBatchReviewed(itemId: string, reviewed: boolean) {
    setBatchItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, reviewed, status: "review" } : item,
      ),
    );
  }

  async function copyAnswer() {
    if (!answer) return;
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadAnswer() {
    if (!answer) return;
    const blob = new Blob([answer], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pembahasan-tpa.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function loadHistoryItem(item: HistoryItem) {
    setAnswer(item.answer);
    setOutputMode(item.outputMode);
    setModelUsed("Riwayat lokal");
    setUsageText(item.createdAt);
  }

  async function loadCloudHistoryData() {
    setIsFetchingHistory(true);
    try {
      const data = await fetchTutorHistory("tpa");
      setCloudHistory(data as CloudHistoryItem[]);
      setCloudHistoryPage(0);
    } finally {
      setIsFetchingHistory(false);
    }
  }

  function loadCloudHistoryItem(item: CloudHistoryItem) {
    setAnswer(item.answer_text);
    if (item.metadata?.outputMode) {
      setOutputMode(item.metadata.outputMode);
    }
    setModelUsed(item.metadata?.model || "Riwayat cloud");
    setUsageText(new Date(item.created_at).toLocaleString("id-ID"));
  }

  function moveHistoryPage(direction: -1 | 1) {
    if (historyMode === "local") {
      if (!history.length) return;
      setHistoryPage((current) =>
        Math.min(Math.max(current + direction, 0), history.length - 1),
      );
    } else {
      if (!cloudHistory.length) return;
      setCloudHistoryPage((current) =>
        Math.min(Math.max(current + direction, 0), cloudHistory.length - 1),
      );
    }
  }

  function confirmHistoryDelete() {
    if (!pendingHistoryDelete) return;

    if (pendingHistoryDelete.kind === "all") {
      setHistory([]);
      setHistoryPage(0);
      setPendingHistoryDelete(null);
      return;
    }

    const nextHistory = history.filter(
      (item) => item.id !== pendingHistoryDelete.id,
    );
    setHistory(nextHistory);
    setHistoryPage((current) =>
      Math.min(current, Math.max(nextHistory.length - 1, 0)),
    );
    setPendingHistoryDelete(null);
  }

  function clearAll() {
    setQuestionText("");
    setCustomInstruction("");
    setImagePreview(null);
    setImageName("");
    setIsTextReviewed(false);
    setOcrProgress(0);
    setOcrStatus("");
    setIsOcrRunning(false);
    setBatchItems([]);
    setBatchStopMessage("");
    setAnswer("");
    setError("");
    setModelUsed("");
    setUsageText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="min-h-dvh bg-[#f5f7f6] text-[#17201c] lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-none flex-col px-3 py-2 sm:px-4 lg:h-dvh lg:min-h-0">
        <header className="flex shrink-0 flex-col gap-2 border-b border-[#d9dfda] pb-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#0f6b57] text-white shadow-sm">
              <BrainCircuit size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal text-[#17201c]">
                Pengajar TPA
              </h1>
              <p className="text-sm leading-5 text-[#65716a]">
                Teks, OCR lokal dengan review, batch, audit, dan pembahasan siap copy.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuestionText(sampleQuestion)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm font-medium text-[#27332e] shadow-sm transition hover:bg-[#eef4f1]"
            >
              <FileText size={16} aria-hidden="true" />
              Contoh
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm font-medium text-[#27332e] shadow-sm transition hover:bg-[#eef4f1]"
            >
              <Settings2 size={16} aria-hidden="true" />
              API
            </button>
          </div>
        </header>

        {showSettings ? (
          <section className="mt-4 rounded-lg border border-[#cfd8d2] bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-base font-semibold text-[#17201c]">
                Pengaturan AI
              </h2>
              <p className="text-sm text-[#65716a]">
                Pilih layanan AI dan kunci akses yang dipakai untuk membuat
                pembahasan.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm font-medium text-[#27332e]">
                Layanan AI
                <select
                  value={apiPreset}
                  onChange={(event) =>
                    handleApiPresetChange(event.target.value as ApiPreset)
                  }
                  className="h-11 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                >
                  <option value="deepseek">DeepSeek V4 Pro</option>
                </select>
                <span className="text-xs font-normal leading-5 text-[#65716a]">
                  Website hanya mengirim teks final ke DeepSeek API.
                </span>
              </label>

              <label className="grid gap-2 text-sm font-medium text-[#27332e]">
                Kualitas jawaban
                <select
                  value={answerQuality}
                  onChange={(event) =>
                    handleAnswerQualityChange(event.target.value as AnswerQuality)
                  }
                  className="h-11 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                >
                  <option value="standard">Standar, cepat, dan ringkas</option>
                  <option value="thorough">Lebih teliti untuk soal sulit</option>
                </select>
                <span className="text-xs font-normal leading-5 text-[#65716a]">
                  Gunakan Standar untuk mayoritas soal. Pilih Lebih teliti saat
                  soal panjang atau rumit.
                </span>
              </label>
            </div>

            <div className="mt-4 rounded-md border border-[#d8e2dc] bg-[#f7faf8] p-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <button
                  type="button"
                  onClick={() => setUseServerKey(true)}
                  className={`min-h-16 rounded-md border px-3 text-left transition ${
                    useServerKey
                      ? "border-[#0f6b57] bg-[#e4f3ee] text-[#0d4f42]"
                      : "border-[#c8d0cb] bg-white text-[#3b4741] hover:bg-[#eef4f1]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    Pakai kunci yang sudah tersimpan
                  </span>
                  <span className="block text-xs leading-5 text-[#65716a]">
                    Pilihan paling mudah untuk komputer ini.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseServerKey(false)}
                  className={`min-h-16 rounded-md border px-3 text-left transition ${
                    !useServerKey
                      ? "border-[#0f6b57] bg-[#e4f3ee] text-[#0d4f42]"
                      : "border-[#c8d0cb] bg-white text-[#3b4741] hover:bg-[#eef4f1]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    Masukkan kunci baru
                  </span>
                  <span className="block text-xs leading-5 text-[#65716a]">
                    Pakai ini jika ingin mencoba kunci DeepSeek lain.
                  </span>
                </button>
              </div>

              <label className="mt-3 grid gap-2 text-sm font-medium text-[#27332e]">
                Kunci API
                <div className="relative">
                  <KeyRound
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65716a]"
                  />
                  <input
                    type="password"
                    value={apiKey}
                    disabled={useServerKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      useServerKey
                        ? "Kunci tersimpan sedang dipakai"
                        : "Tempel kunci API di sini"
                    }
                    className="h-11 w-full rounded-md border border-[#c8d0cb] bg-white px-9 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce] disabled:bg-[#eef1ef]"
                  />
                </div>
                <span className="text-xs font-normal leading-5 text-[#65716a]">
                  Kunci baru hanya dipakai untuk permintaan ini dan tidak
                  disimpan di riwayat.
                </span>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedApi((current) => !current)}
                className="inline-flex h-10 w-fit items-center rounded-md border border-[#c8d0cb] bg-white px-3 text-sm font-medium text-[#27332e] transition hover:bg-[#eef4f1]"
              >
                {showAdvancedApi
                  ? "Sembunyikan pengaturan lanjutan"
                  : "Tampilkan pengaturan lanjutan"}
              </button>

              {showAdvancedApi ? (
                <div className="grid gap-3 rounded-md border border-[#e1e6e2] bg-white p-3 lg:grid-cols-[1fr_1fr_180px_180px]">
                  <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                    Alamat layanan
                    <input
                      value={baseUrl}
                      onChange={(event) => {
                        setBaseUrl(event.target.value);
                      }}
                      className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 font-mono text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                    Nama model
                    <input
                      value={model}
                      onChange={(event) => {
                        setModel(event.target.value);
                      }}
                      className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 font-mono text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                    Ketelitian mesin
                    <select
                      value={reasoningEffort}
                      onChange={(event) =>
                        setReasoningEffort(event.target.value as ReasoningEffort)
                      }
                      className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                    >
                      <option value="high">Tinggi</option>
                      <option value="max">Maksimal</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                    Panjang jawaban
                    <input
                      type="number"
                      min={500}
                      max={12000}
                      value={maxTokens}
                      onChange={(event) =>
                        setMaxTokens(Number(event.target.value))
                      }
                      className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 rounded-md border border-[#c8d0cb] bg-[#f7faf8] px-3 text-sm font-medium text-[#27332e] lg:col-span-2">
                    <input
                      type="checkbox"
                      checked={useDeepSeekThinking}
                      onChange={(event) =>
                        setUseDeepSeekThinking(event.target.checked)
                      }
                      className="size-4 accent-[#0f6b57]"
                    />
                    Aktifkan mode berpikir mendalam untuk DeepSeek
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#27332e] lg:col-span-2">
                    Kreativitas jawaban
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={1}
                      value={temperature}
                      onChange={(event) =>
                        setTemperature(Number(event.target.value))
                      }
                      className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="grid flex-1 gap-3 py-3 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)] 2xl:grid-cols-[minmax(760px,1.35fr)_minmax(520px,0.9fr)]">
          <section className="flex min-h-[720px] flex-col rounded-lg border border-[#cfd8d2] bg-white shadow-sm lg:min-h-0 lg:overflow-auto 2xl:overflow-hidden">
            <div className="shrink-0 border-b border-[#e1e6e2] p-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(outputModeLabels) as OutputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOutputMode(mode)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-left text-sm transition ${
                      outputMode === mode
                        ? "border-[#0f6b57] bg-[#e4f3ee] text-[#0d4f42]"
                        : "border-[#d7ded9] bg-white text-[#56625b] hover:bg-[#f5f8f6]"
                    }`}
                  >
                    <span className="block font-semibold">
                      {outputModeLabels[mode]}
                    </span>
                    <span className="block text-xs">{modeDescriptions[mode]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid shrink-0 gap-3 p-3 md:grid-cols-[220px_minmax(260px,1fr)] 2xl:grid-cols-[220px_minmax(260px,0.7fr)_minmax(360px,1fr)]">
              <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                Domain
                <select
                  value={domain}
                  onChange={(event) => setDomain(event.target.value as TpaDomain)}
                  className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                >
                  {tpaDomains.map((item) => (
                    <option key={item} value={item}>
                      {item === "auto" ? "Auto" : item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-1 rounded-md border border-[#d7ded9] bg-[#f8faf9] p-3 text-sm text-[#27332e]">
                <span className="font-medium">Mode gambar</span>
                <span className="text-xs leading-5 text-[#65716a]">
                  OCR lokal, lalu teks wajib dicek sebelum dikirim.
                </span>
              </div>
              {baseUrl.includes("deepseek.com") ? (
                <div className="flex gap-2 rounded-md border border-[#e0b75c] bg-[#fff7e2] p-3 text-sm leading-5 text-[#6a4d12] md:col-span-2 2xl:col-span-1">
                  <AlertTriangle
                    size={17}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <p>
                    DeepSeek dipakai sebagai text model. Gambar dibaca OCR
                    lokal, lalu hanya teks yang sudah dicek yang dikirim.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 overflow-auto px-3 pb-3 xl:grid-cols-[minmax(300px,0.9fr)_minmax(320px,1.1fr)] 2xl:grid-cols-[minmax(360px,0.9fr)_minmax(460px,1.1fr)]">
              <label className="flex min-h-0 flex-col gap-2 text-sm font-medium text-[#27332e]">
                Teks soal / hasil OCR
                <textarea
                  value={questionText}
                  onChange={(event) => {
                    setQuestionText(event.target.value);
                    if (imagePreview) setIsTextReviewed(false);
                  }}
                  placeholder="Paste soal, atau cek dan koreksi hasil OCR dari gambar di sini."
                  className="min-h-[210px] flex-1 resize-none rounded-md border border-[#c8d0cb] bg-white p-3 text-base leading-7 outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce] 2xl:min-h-[260px]"
                />
              </label>

              <div className="flex min-h-0 flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    void handleFilesChange(event.currentTarget.files)
                  }
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm font-medium text-[#27332e] transition hover:bg-[#eef4f1]"
                >
                  <Upload size={16} aria-hidden="true" />
                  Upload gambar untuk OCR
                </button>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={handleDropzoneKeyDown}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleImageDrop}
                  className={`relative grid min-h-[150px] flex-1 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed bg-[#f8faf9] transition 2xl:min-h-[220px] ${
                    isDragActive
                      ? "border-[#0f6b57] bg-[#e4f3ee] ring-2 ring-[#b9d7ce]"
                      : "border-[#bac5bd] hover:bg-[#f2f6f4]"
                  }`}
                  aria-label="Upload atau drag and drop gambar soal"
                >
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview soal"
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 46vw, 260px"
                        className="object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setImagePreview(null);
                        }}
                        className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white text-[#3c4741] shadow-sm"
                        aria-label="Hapus gambar"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : batchItems.length ? (
                    <div className="grid justify-items-center gap-2 px-4 text-center text-sm text-[#6a756e]">
                      <ImageIcon size={34} aria-hidden="true" />
                      <span className="font-medium text-[#3b4741]">
                        {batchItems.length} gambar masuk batch OCR
                      </span>
                      <span className="text-xs">
                        Cek hasil OCR tiap item sebelum generate.
                      </span>
                    </div>
                  ) : (
                    <div className="grid justify-items-center gap-2 px-4 text-center text-sm text-[#6a756e]">
                      <ImageIcon size={34} aria-hidden="true" />
                      <span className="font-medium text-[#3b4741]">
                        Drop gambar di sini
                      </span>
                      <span className="text-xs">atau klik untuk memilih file</span>
                    </div>
                  )}
                </div>

                {imageName && !batchItems.length ? (
                  <div className="grid gap-2 rounded-md border border-[#d8e2dc] bg-[#f7faf8] p-2 text-xs leading-5 text-[#59655e] 2xl:p-3">
                    <span className="block font-medium text-[#27332e]">
                      {imageName}
                    </span>
                    <div className="h-2 overflow-hidden rounded-md bg-[#e7ece8] relative">
                      <motion.div
                        className="absolute inset-0 bg-[#225e76] transition-all"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(ocrProgress * 100)}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
                      />
                      {isOcrRunning && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                    <div className="h-5 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={ocrStatus}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                          className="block text-[#59655e]"
                        >
                          {ocrStatus || "Menunggu OCR lokal."}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <label className="flex items-start gap-2 rounded-md border border-[#c8d0cb] bg-white p-2 text-sm font-medium text-[#27332e]">
                      <input
                        type="checkbox"
                        checked={isTextReviewed}
                        disabled={isOcrRunning || !questionText.trim()}
                        onChange={(event) =>
                          setIsTextReviewed(event.target.checked)
                        }
                        className="mt-1 size-4 accent-[#0f6b57]"
                      />
                      <span>
                        Saya sudah cek dan koreksi hasil OCR.
                      </span>
                    </label>
                  </div>
                ) : null}

                {batchItems.length ? (
                  <div className="max-h-44 overflow-auto rounded-md border border-[#d8e2dc] bg-[#f7faf8]">
                    {batchItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-1 border-b border-[#e2e8e4] p-3 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-1 text-sm font-medium text-[#27332e]">
                            {item.name}
                          </span>
                          <span
                            className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${
                              item.status === "done"
                                ? "bg-[#e4f3ee] text-[#0d4f42]"
                                : item.status === "failed" ||
                                    item.status === "stopped"
                                  ? "bg-[#fff0ed] text-[#813126]"
                                  : item.status === "ocr" || item.status === "running"
                                    ? "bg-[#e7f0f6] text-[#225e76] relative overflow-hidden"
                                    : "bg-white text-[#65716a]"
                                }`}
                                >
                                {batchStatusLabels[item.status]}
                                {(item.status === "ocr" || item.status === "running") && (
                                <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                                )}
                                </span>
                                </div>
                                <span className="text-xs text-[#65716a]">
                                {formatFileSize(item.size)}
                                {typeof item.ocrProgress === "number"
                                ? ` · OCR ${Math.round(item.ocrProgress * 100)}%`
                                : ""}
                                {item.usageText ? ` · ${item.usageText}` : ""}
                                </span>
                                {item.status === "ocr" && (
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#e7ece8]">
                                <motion.div
                                className="h-full bg-[#225e76]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round((item.ocrProgress || 0) * 100)}%` }}
                                />
                                </div>
                                )}
                                {item.error ? (
                                <span className="text-xs leading-5 text-[#813126]">
                                {item.error}
                                </span>
                                ) : null}
                                </div>
                                ))}
                                </div>
                                ) : null}
                                </div>
                                </div>

                                {batchItems.length ? (
                                <section className="grid max-h-60 shrink-0 gap-3 overflow-auto border-t border-[#e1e6e2] p-3">
                                <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                <h2 className="text-base font-semibold text-[#17201c]">
                                Review OCR batch
                                </h2>
                                <div className="text-xs font-medium text-[#225e76] bg-[#e7f0f6] px-2 py-0.5 rounded-full">
                                {batchItems.filter(i => i.reviewed).length} / {batchItems.length} Selesai
                                </div>
                                </div>
                                <p className="text-sm leading-6 text-[#65716a]">
                                Cek simbol, angka, opsi A-E, dan tanda matematika. Item
                                hanya dikirim ke DeepSeek setelah dicentang.
                                </p>
                                </div>

                                <div className="grid gap-3">
                                {batchItems.map((item, index) => (
                                <div
                                key={item.id}
                                className="rounded-md border border-[#d8e2dc] bg-[#f8faf9] p-3"
                                >
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="h-10">
                                <h3 className="text-sm font-semibold text-[#27332e]">
                                File {index + 1}: {item.name}
                                </h3>
                                <AnimatePresence mode="wait">
                                <motion.p
                                key={item.ocrStatus || item.status}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 5 }}
                                className="text-xs leading-5 text-[#65716a]"
                                >
                                {item.ocrStatus || batchStatusLabels[item.status]}
                                </motion.p>
                                </AnimatePresence>
                                </div>
                                <motion.span
                                animate={item.status === "ocr" ? { opacity: [1, 0.5, 1] } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className={`rounded px-2 py-1 text-xs font-medium ${
                                item.reviewed
                                ? "bg-[#e4f3ee] text-[#0d4f42]"
                                : item.status === "ocr"
                                ? "bg-[#e7f0f6] text-[#225e76]"
                                : "bg-[#fff7e2] text-[#6a4d12]"
                                }`}
                                >
                                {item.reviewed ? "Sudah dicek" : item.status === "ocr" ? "Sedang OCR..." : "Perlu dicek"}
                                </motion.span>
                                </div>
                                <div className="relative">
                                <textarea
                                value={item.ocrText}
                                onChange={(event) =>
                                updateBatchOcrText(item.id, event.target.value)
                                }
                                placeholder="Hasil OCR muncul di sini. Jika kosong atau salah, ketik ulang soal dari gambar."
                                className={`min-h-28 w-full resize-y rounded-md border border-[#c8d0cb] bg-white p-3 text-sm leading-6 outline-none transition-all focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce] ${
                                item.status === "ocr" ? "opacity-50 grayscale-[0.5]" : ""
                                }`}
                                />
                                {item.status === "ocr" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
                                <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-[#225e76]" />
                                <span className="text-[10px] font-medium text-[#225e76] uppercase tracking-wider">Processing AI...</span>
                                </div>
                                </div>
                                )}
                                </div>

                      <label className="mt-2 flex items-start gap-2 text-sm font-medium text-[#27332e]">
                        <input
                          type="checkbox"
                          checked={item.reviewed}
                          disabled={!item.ocrText.trim() || item.status === "ocr"}
                          onChange={(event) =>
                            updateBatchReviewed(item.id, event.target.checked)
                          }
                          className="mt-1 size-4 accent-[#0f6b57]"
                        />
                        <span>
                          Teks OCR file ini sudah saya cek dan koreksi.
                        </span>
                      </label>
                      <AnimatePresence>
                        {item.error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50/30 p-2 text-xs text-rose-800"
                          >
                            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                            <p>{item.error}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid shrink-0 gap-2 px-3 pb-3">
              <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                Instruksi tambahan
                <input
                  value={customInstruction}
                  onChange={(event) => setCustomInstruction(event.target.value)}
                  placeholder="Opsional: misalnya bahas lebih singkat, cek kunci lama, atau jelaskan untuk siswa pemula."
                  className="h-11 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                />
              </label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as any }}
                  className="mx-4 mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-sm text-rose-900 shadow-sm backdrop-blur-sm">
                    <motion.div
                      animate={{ x: [0, -2, 2, -2, 2, 0] }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="shrink-0"
                    >
                      <AlertTriangle size={18} aria-hidden="true" className="text-rose-500" />
                    </motion.div>
                    <p className="grow leading-relaxed">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      className="shrink-0 rounded-md p-0.5 hover:bg-rose-100/50 transition-colors"
                      aria-label="Tutup pesan error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {batchStopMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as any }}
                  className="mx-4 mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-900 shadow-sm backdrop-blur-sm">
                    <motion.div
                      animate={{ x: [0, -1, 1, -1, 1, 0] }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="shrink-0"
                    >
                      <AlertTriangle size={18} aria-hidden="true" className="text-amber-500" />
                    </motion.div>
                    <p className="grow leading-relaxed">{batchStopMessage}</p>
                    <button
                      type="button"
                      onClick={() => setBatchStopMessage("")}
                      className="shrink-0 rounded-md p-0.5 hover:bg-amber-100/50 transition-colors"
                      aria-label="Tutup pesan"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e1e6e2] p-3">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[#c8d0cb] bg-white px-4 text-sm font-medium text-[#27332e] transition hover:bg-[#f5f8f6]"
              >
                <Eraser size={16} aria-hidden="true" />
                Bersihkan
              </button>
              <button
                type="button"
                onClick={batchItems.length ? solveBatch : solve}
                disabled={batchItems.length ? !canSolveBatch : !canSolveSingle}
                className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-md bg-[#0f6b57] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b5747] disabled:cursor-not-allowed disabled:bg-[#9bb6ae]"
              >
                {isSolving || isBatchSolving ? (
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={17} aria-hidden="true" />
                )}
                {batchItems.length ? "Generate batch" : "Generate"}
              </button>
            </div>
          </section>

          <aside className="grid min-h-[720px] grid-rows-[minmax(0,1fr)_auto] gap-3 lg:min-h-0">
            <section className="flex min-h-0 flex-col rounded-lg border border-[#cfd8d2] bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[#e1e6e2] p-3">
                <div>
                  <h2 className="text-base font-semibold text-[#17201c]">Output</h2>
                  <p className="text-sm text-[#65716a]">
                    {modelUsed ? `${modelUsed}${usageText ? ` · ${usageText}` : ""}` : "Belum ada hasil"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyAnswer}
                    disabled={!answer}
                    className="grid size-10 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#eef4f1] disabled:text-[#a3aaa6]"
                    aria-label="Copy output"
                    title="Copy output"
                  >
                    {copied ? (
                      <Check size={17} aria-hidden="true" />
                    ) : (
                      <Copy size={17} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={downloadAnswer}
                    disabled={!answer}
                    className="grid size-10 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#eef4f1] disabled:text-[#a3aaa6]"
                    aria-label="Download output"
                    title="Download output"
                  >
                    <Download size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {answer ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-7 text-[#1f2b25]">
                    {answer}
                  </pre>
                ) : (
                  <div className="grid h-full min-h-0 place-items-center rounded-md border border-dashed border-[#d4ddd6] bg-[#f8faf9] p-6 text-center text-sm text-[#65716a]">
                    <div className="grid justify-items-center gap-3">
                      <Clipboard size={34} aria-hidden="true" />
                      <span>Hasil pembahasan muncul di sini.</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#cfd8d2] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#e1e6e2] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={17} aria-hidden="true" className="text-[#65716a]" />
                    <h2 className="text-base font-semibold text-[#17201c]">
                      {historyMode === "local" ? "Riwayat lokal" : "Riwayat cloud"}
                    </h2>
                  </div>
                  <div className="flex rounded-md bg-[#f0f4f2] p-1">
                    <button
                      type="button"
                      onClick={() => setHistoryMode("local")}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${
                        historyMode === "local"
                          ? "bg-white text-[#27332e] shadow-sm"
                          : "text-[#65716a] hover:text-[#27332e]"
                      }`}
                    >
                      Lokal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryMode("cloud");
                        if (cloudHistory.length === 0) {
                          void loadCloudHistoryData();
                        }
                      }}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${
                        historyMode === "cloud"
                          ? "bg-white text-[#27332e] shadow-sm"
                          : "text-[#65716a] hover:text-[#27332e]"
                      }`}
                    >
                      Cloud
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs leading-5 text-[#65716a]">
                    {historyMode === "local" ? (
                      historyTotal ? `${visibleHistoryIndex + 1}/${historyTotal}` : "0/0"
                    ) : (
                      cloudHistoryTotal ? `${visibleCloudHistoryIndex + 1}/${cloudHistoryTotal}` : "0/0"
                    )}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveHistoryPage(-1)}
                      disabled={
                        (historyMode === "local" && (!historyTotal || visibleHistoryIndex === 0)) ||
                        (historyMode === "cloud" && (!cloudHistoryTotal || visibleCloudHistoryIndex === 0))
                      }
                      className="grid size-9 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                      aria-label="Riwayat sebelumnya"
                      title="Riwayat sebelumnya"
                    >
                      <ChevronLeft size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHistoryPage(1)}
                      disabled={
                        (historyMode === "local" && (!historyTotal || visibleHistoryIndex >= historyTotal - 1)) ||
                        (historyMode === "cloud" && (!cloudHistoryTotal || visibleCloudHistoryIndex >= cloudHistoryTotal - 1))
                      }
                      className="grid size-9 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                      aria-label="Riwayat berikutnya"
                      title="Riwayat berikutnya"
                    >
                      <ChevronRight size={17} aria-hidden="true" />
                    </button>
                    {historyMode === "local" ? (
                      <button
                        type="button"
                        onClick={() => setPendingHistoryDelete({ kind: "all" })}
                        disabled={!historyTotal}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#c8d0cb] bg-white px-2.5 text-xs font-medium text-[#27332e] transition hover:bg-[#fff1ef] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Hapus semua
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={loadCloudHistoryData}
                        disabled={isFetchingHistory}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#c8d0cb] bg-white px-2.5 text-xs font-medium text-[#27332e] transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                      >
                        {isFetchingHistory ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Upload size={15} />
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
                        onClick={() => loadHistoryItem(visibleHistoryItem)}
                        className="grid min-w-0 flex-1 gap-1 rounded-md p-2 text-left transition hover:bg-[#eef4f1]"
                      >
                        <span className="text-sm font-semibold text-[#27332e]">
                          {outputModeLabels[visibleHistoryItem.outputMode]}
                        </span>
                        <span className="text-xs leading-5 text-[#65716a]">
                          {visibleHistoryItem.createdAt}
                        </span>
                        <span className="line-clamp-2 text-xs leading-5 text-[#65716a]">
                          {visibleHistoryItem.questionPreview}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingHistoryDelete({
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
                    <div className="p-4 text-center text-sm text-[#65716a]">
                      <History size={24} className="mx-auto mb-2 opacity-20" />
                      <p>Belum ada riwayat lokal.</p>
                    </div>
                  )
                ) : (
                  visibleCloudHistoryItem ? (
                    <div className="flex items-start gap-2 rounded-md bg-[#f7faf8] p-2">
                      <button
                        type="button"
                        onClick={() => loadCloudHistoryItem(visibleCloudHistoryItem)}
                        className="grid min-w-0 flex-1 gap-1 rounded-md p-2 text-left transition hover:bg-[#eef4f1]"
                      >
                        <span className="text-sm font-semibold text-[#27332e]">
                          {visibleCloudHistoryItem.metadata?.outputMode
                            ? outputModeLabels[visibleCloudHistoryItem.metadata.outputMode]
                            : "Pembahasan"}
                        </span>
                        <span className="text-xs leading-5 text-[#65716a]">
                          {new Date(visibleCloudHistoryItem.created_at).toLocaleString("id-ID")}
                        </span>
                        <span className="line-clamp-2 text-xs leading-5 text-[#65716a]">
                          {buildQuestionPreview(visibleCloudHistoryItem.question_text)}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid place-items-center py-8 text-center text-xs text-[#65716a]">
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
                            onClick={loadCloudHistoryData}
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
          </aside>
        </div>

        {pendingHistoryDelete ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/30 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-delete-title"
              className="w-full max-w-sm rounded-lg border border-[#cfd8d2] bg-white p-4 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#fff1ef] text-[#8a2f22]">
                  <Trash2 size={18} aria-hidden="true" />
                </div>
                <div className="grid gap-1">
                  <h3
                    id="history-delete-title"
                    className="text-base font-semibold text-[#17201c]"
                  >
                    {pendingHistoryDelete.kind === "all"
                      ? "Hapus semua riwayat?"
                      : "Hapus riwayat ini?"}
                  </h3>
                  <p className="text-sm leading-6 text-[#65716a]">
                    {pendingHistoryDelete.kind === "all"
                      ? "Semua riwayat lokal di browser ini akan dihapus."
                      : "Item riwayat lokal ini akan dihapus dari browser ini."}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingHistoryDelete(null)}
                  className="inline-flex h-10 items-center rounded-md border border-[#c8d0cb] bg-white px-4 text-sm font-medium text-[#27332e] transition hover:bg-[#f5f8f6]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmHistoryDelete}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8a2f22] px-4 text-sm font-semibold text-white transition hover:bg-[#70251b]"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
