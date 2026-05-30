import { NextResponse } from "next/server";
import {
  buildTbiUserPrompt,
  TBI_SYSTEM_PROMPT,
  type OutputMode,
  type TbiQuestionType,
} from "@/lib/tbi-prompt";

export const runtime = "nodejs";

type ReasoningEffort = "high" | "max";

type SolveRequest = {
  questionText?: string;
  imageDataUrl?: string | null;
  imageMode?: "ocr" | "vision";
  outputMode?: OutputMode;
  questionType?: TbiQuestionType;
  customInstruction?: string;
  provider?: {
    apiKey?: string;
    useServerKey?: boolean;
    baseUrl?: string;
    model?: string;
    useDeepSeekThinking?: boolean;
    reasoningEffort?: ReasoningEffort;
    temperature?: number;
    maxTokens?: number;
  };
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string };

const DEFAULT_BASE_URL =
  process.env.DEFAULT_LLM_BASE_URL ||
  process.env.DEEPSEEK_API_BASE_URL ||
  "https://api.deepseek.com";

const DEFAULT_MODEL =
  process.env.DEFAULT_LLM_MODEL ||
  process.env.DEEPSEEK_MODEL ||
  "deepseek-v4-pro";

function normalizeBaseUrl(baseUrl?: string) {
  return (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
}

function buildChatEndpoint(baseUrl: string) {
  if (/\/chat\/completions$/i.test(baseUrl)) {
    return baseUrl;
  }

  return `${baseUrl}/chat/completions`;
}

function isDeepSeekBaseUrl(baseUrl: string) {
  try {
    return /(^|\.)deepseek\.com$/i.test(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function extractContent(payload: unknown) {
  const data = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
    content?: unknown;
  };
  const content = data.choices?.[0]?.message?.content ?? data.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function extractStopReason(payload: unknown) {
  const data = payload as {
    choices?: Array<{ finish_reason?: unknown }>;
    stop_reason?: unknown;
  };
  const reason = data.choices?.[0]?.finish_reason ?? data.stop_reason;

  return typeof reason === "string" ? reason : null;
}

function isContextLimitSignal(value: string) {
  return /context|token|maximum|too large|payload|length|FUNCTION_PAYLOAD_TOO_LARGE/i.test(
    value,
  );
}

function normalizeTbiAnswer(answer: string, outputMode: OutputMode) {
  if (outputMode === "audit") {
    return answer;
  }

  const match = answer.match(/Jawaban\s*:\s*([A-E])\b/i);
  const answerLetter = match?.[1]?.toUpperCase();

  if (!answerLetter) {
    return answer.trim();
  }

  let normalized = answer
    .trim()
    .replace(
      /^Jawaban\s*:\s*[A-E](?:[ \t.:)-]+[^\r\n]*)?/i,
      `Jawaban: ${answerLetter}`,
    );

  const closingPattern =
    /Oleh\s+karena\s+itu,?\s+jawaban\s+yang\s+paling\s+(?:benar|tepat)\s+adalah\s+[A-E](?:[ \t.:)-]+[^\r\n]*)?\.?$/i;
  const requiredClosing =
    outputMode === "docx"
      ? `Oleh karena itu, jawaban yang paling tepat adalah ${answerLetter}.`
      : `Oleh karena itu jawaban yang paling benar adalah ${answerLetter}.`;

  if (closingPattern.test(normalized)) {
    normalized = normalized.replace(closingPattern, requiredClosing);
  } else if (outputMode === "standard" || outputMode === "docx") {
    normalized = `${normalized.replace(/\s+$/g, "")}\n\n${requiredClosing}`;
  }

  return normalized;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SolveRequest;
    const baseUrl = normalizeBaseUrl(body.provider?.baseUrl);
    const endpoint = buildChatEndpoint(baseUrl);
    const model = body.provider?.model?.trim() || DEFAULT_MODEL;
    const providedApiKey = body.provider?.apiKey?.trim() || "";
    const useServerKey = body.provider?.useServerKey !== false;
    const apiKey = useServerKey
      ? providedApiKey || process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY
      : providedApiKey;

    const questionText = body.questionText?.trim() || "";
    const imageMode = body.imageMode || "ocr";
    const outputMode = body.outputMode || "standard";
    const questionType = body.questionType || "auto";

    if (!isDeepSeekBaseUrl(baseUrl)) {
      return NextResponse.json(
        { error: "Website ini hanya dikonfigurasi untuk DeepSeek API." },
        { status: 400 },
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: useServerKey
            ? "Kunci API belum tersedia. Simpan kunci di .env.local atau pilih Masukkan kunci baru."
            : "Kunci API belum diisi. Tempel kunci API, atau pilih Pakai kunci yang sudah tersimpan.",
        },
        { status: 400 },
      );
    }

    if (!questionText) {
      return NextResponse.json(
        {
          error:
            "Isi soal belum ada. Jalankan OCR lokal dari gambar, cek hasilnya, lalu kirim teks ke DeepSeek.",
        },
        { status: 400 },
      );
    }

    const userPrompt = buildTbiUserPrompt({
      questionText,
      questionType,
      outputMode,
      customInstruction: body.customInstruction,
      imageMode,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: TBI_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: clampNumber(body.provider?.temperature, 0.2, 0, 1),
      max_tokens: clampNumber(body.provider?.maxTokens, 1800, 500, 12000),
      stream: false,
    };

    if (body.provider?.useDeepSeekThinking !== false && isDeepSeekBaseUrl(baseUrl)) {
      payload.thinking = { type: "enabled" };
      payload.reasoning_effort = body.provider?.reasoningEffort || "high";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responsePayload = await parseJsonResponse(response);

    if (!response.ok) {
      const errorPayload = responsePayload as {
        error?: { message?: string };
        message?: string;
        raw?: string;
      };
      const providerMessage =
        errorPayload.error?.message ||
        errorPayload.message ||
        errorPayload.raw ||
        `Provider mengembalikan HTTP ${response.status}.`;

      return NextResponse.json(
        {
          error: providerMessage,
          limitReached:
            response.status === 413 || isContextLimitSignal(providerMessage),
        },
        { status: response.status },
      );
    }

    const stopReason = extractStopReason(responsePayload);
    const limitReached =
      stopReason === "length" ||
      Boolean(stopReason && isContextLimitSignal(stopReason));
    const answer = normalizeTbiAnswer(
      extractContent(responsePayload),
      outputMode,
    );

    if (!answer) {
      return NextResponse.json(
        { error: "Provider tidak mengembalikan konten jawaban." },
        { status: 502 },
      );
    }

    const data = responsePayload as {
      model?: string;
      usage?: unknown;
    };

    return NextResponse.json({
      answer,
      model: data.model || model,
      usage: data.usage || null,
      stopReason,
      limitReached,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memproses permintaan.";

    return NextResponse.json(
      {
        error: message,
        limitReached: isContextLimitSignal(message),
      },
      { status: 500 },
    );
  }
}
