import type { HistoryItem } from "@/components/shared/types";

export const STORAGE_LIMIT_ESTIMATE = 5 * 1024 * 1024; // 5MB is a safe estimate for localStorage

export function calculateLocalStorageSize() {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (const key in localStorage) {
    if (!localStorage.hasOwnProperty(key)) continue;
    total += (localStorage[key].length + key.length) * 2; // UTF-16 uses 2 bytes per char
  }
  return total;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function exportHistory(key: string, filename: string) {
  const data = localStorage.getItem(key);
  if (!data) return false;
  
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function importHistory(file: File): Promise<HistoryItem[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
