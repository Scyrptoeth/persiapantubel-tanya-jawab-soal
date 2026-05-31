export type HistoryMode = "local";

export type HistoryItem = {
  id: string;
  createdAt: string;
  questionPreview: string;
  outputMode: string;
  answer: string;
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    isMainAnswer?: boolean;
  }>;
};

export type HistoryDeleteTarget =
  | { kind: "single"; id: string }
  | { kind: "all" }
  | null;

export type BatchStatus =
  | "pending"
  | "ocr"
  | "review"
  | "running"
  | "done"
  | "failed"
  | "stopped";

export type BatchItem = {
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
