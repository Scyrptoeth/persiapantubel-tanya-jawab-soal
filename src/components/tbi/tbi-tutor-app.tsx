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
import {
  outputModeLabels,
  tbiQuestionTypes,
  type OutputMode,
  type TbiQuestionType,
} from "@/lib/tbi-prompt";

type ImageMode = "ocr" | "vision";
type ReasoningEffort = "high" | "max";
type ApiPreset = "deepseek" | "custom";
type AnswerQuality = "standard" | "thorough";
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
  const [historyPage, setHistoryPage] = useState(0);
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

    window.localStorage.setItem(
      "tbi-tutor-history",
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
    const response = await fetch("/api/tbi/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: input.questionText,
        imageDataUrl: null,
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
    link.download = "pembahasan-tbi.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function loadHistoryItem(item: HistoryItem) {
    setAnswer(item.answer);
    setOutputMode(item.outputMode);
    setModelUsed("Riwayat lokal");
    setUsageText(item.createdAt);
  }

  function moveHistoryPage(direction: -1 | 1) {
    if (!historyTotal) return;
    setHistoryPage((current) =>
      Math.min(Math.max(current + direction, 0), historyTotal - 1),
    );
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
                Pengajar TBI
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

            <div className="grid shrink-0 gap-3 p-3 md:grid-cols-[220px_minmax(260px,1fr)]">
              <label className="grid gap-1 text-sm font-medium text-[#27332e]">
                Tipe soal
                <select
                  value={questionType}
                  onChange={(event) =>
                    setQuestionType(event.target.value as TbiQuestionType)
                  }
                  className="h-10 rounded-md border border-[#c8d0cb] bg-white px-3 text-sm outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                >
                  {tbiQuestionTypes.map((item) => (
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
                <div className="flex gap-2 rounded-md border border-[#e0b75c] bg-[#fff7e2] p-3 text-sm leading-5 text-[#6a4d12] md:col-span-2">
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
                    <div className="h-2 overflow-hidden rounded-md bg-[#e7ece8]">
                      <div
                        className="h-full bg-[#225e76] transition-all"
                        style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                      />
                    </div>
                    <span>{ocrStatus || "Menunggu OCR lokal."}</span>
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
                                  : item.status === "running"
                                    ? "bg-[#e7f0f6] text-[#225e76]"
                                    : "bg-white text-[#65716a]"
                            }`}
                          >
                            {batchStatusLabels[item.status]}
                          </span>
                        </div>
                        <span className="text-xs text-[#65716a]">
                          {formatFileSize(item.size)}
                          {typeof item.ocrProgress === "number"
                            ? ` · OCR ${Math.round(item.ocrProgress * 100)}%`
                            : ""}
                          {item.usageText ? ` · ${item.usageText}` : ""}
                        </span>
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
                  <h2 className="text-base font-semibold text-[#17201c]">
                    Review OCR batch
                  </h2>
                  <p className="text-sm leading-6 text-[#65716a]">
                    Cek titik-titik, underline pilihan A-D, huruf pilihan
                    jawaban, hyphen, dan punctuation. Item
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
                        <div>
                          <h3 className="text-sm font-semibold text-[#27332e]">
                            File {index + 1}: {item.name}
                          </h3>
                          <p className="text-xs leading-5 text-[#65716a]">
                            {item.ocrStatus || batchStatusLabels[item.status]}
                          </p>
                        </div>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            item.reviewed
                              ? "bg-[#e4f3ee] text-[#0d4f42]"
                              : "bg-[#fff7e2] text-[#6a4d12]"
                          }`}
                        >
                          {item.reviewed ? "Sudah dicek" : "Perlu dicek"}
                        </span>
                      </div>
                      <textarea
                        value={item.ocrText}
                        onChange={(event) =>
                          updateBatchOcrText(item.id, event.target.value)
                        }
                        placeholder="Hasil OCR muncul di sini. Jika kosong atau salah, ketik ulang soal dari gambar."
                        className="min-h-28 w-full resize-y rounded-md border border-[#c8d0cb] bg-white p-3 text-sm leading-6 outline-none focus:border-[#0f6b57] focus:ring-2 focus:ring-[#b9d7ce]"
                      />
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

            {error ? (
              <div className="mx-4 mb-4 flex gap-2 rounded-md border border-[#e4a9a0] bg-[#fff0ed] p-3 text-sm text-[#813126]">
                <AlertTriangle size={18} aria-hidden="true" className="mt-0.5" />
                <p>{error}</p>
              </div>
            ) : null}

            {batchStopMessage ? (
              <div className="mx-4 mb-4 flex gap-2 rounded-md border border-[#e0b75c] bg-[#fff7e2] p-3 text-sm text-[#6a4d12]">
                <AlertTriangle size={18} aria-hidden="true" className="mt-0.5" />
                <p>{batchStopMessage}</p>
              </div>
            ) : null}

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
              <div className="flex items-center justify-between border-b border-[#e1e6e2] p-3">
                <div className="flex items-center gap-2">
                  <History size={17} aria-hidden="true" className="text-[#65716a]" />
                  <div>
                    <h2 className="text-base font-semibold text-[#17201c]">
                      Riwayat lokal
                    </h2>
                    <p className="text-xs leading-5 text-[#65716a]">
                      {historyTotal
                        ? `${visibleHistoryIndex + 1}/${historyTotal}`
                        : "0/0"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveHistoryPage(-1)}
                    disabled={!historyTotal || visibleHistoryIndex === 0}
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
                      !historyTotal || visibleHistoryIndex >= historyTotal - 1
                    }
                    className="grid size-9 place-items-center rounded-md border border-[#c8d0cb] bg-white text-[#27332e] transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                    aria-label="Riwayat berikutnya"
                    title="Riwayat berikutnya"
                  >
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingHistoryDelete({ kind: "all" })}
                    disabled={!historyTotal}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#c8d0cb] bg-white px-2.5 text-xs font-medium text-[#27332e] transition hover:bg-[#fff1ef] disabled:cursor-not-allowed disabled:text-[#a3aaa6]"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Hapus semua
                  </button>
                </div>
              </div>
              <div className="p-2">
                {visibleHistoryItem ? (
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
                  <div className="p-4 text-sm text-[#65716a]">
                    Belum ada riwayat.
                  </div>
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
