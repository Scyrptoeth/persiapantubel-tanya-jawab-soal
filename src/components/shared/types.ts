export type HistoryMode = "local" | "cloud";

export type HistoryItem = {
  id: string;
  createdAt: string;
  questionPreview: string;
  outputMode: string;
  answer: string;
};

export type CloudHistoryItem = {
  id: number;
  created_at: string;
  question_text: string;
  answer_text: string;
  domain: string;
  metadata?: {
    outputMode?: string;
    model?: string;
  };
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
