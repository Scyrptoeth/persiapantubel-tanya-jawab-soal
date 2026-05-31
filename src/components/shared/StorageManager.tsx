"use client";

import { Download, Upload, Database, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { 
  calculateLocalStorageSize, 
  STORAGE_LIMIT_ESTIMATE, 
  formatBytes,
  exportHistory,
  importHistory
} from "@/lib/storage-utils";
import type { HistoryItem } from "./types";

interface StorageManagerProps {
  historyKey: string;
  onImportSuccess: (data: HistoryItem[]) => void;
}

export function StorageManager({ historyKey, onImportSuccess }: StorageManagerProps) {
  const [usedSize, setUsedSize] = useState(0);
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const size = calculateLocalStorageSize();
    setUsedSize(size);
  }, []);

  const usagePercent = Math.min(100, (usedSize / STORAGE_LIMIT_ESTIMATE) * 100);
  const isNearLimit = usagePercent > 80;

  function handleExport() {
    exportHistory(historyKey, `${historyKey}-export.json`);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await importHistory(file);
    if (data) {
      onImportSuccess(data);
      setUsedSize(calculateLocalStorageSize());
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setImportError(true);
    }
  }

  return (
    <div className="mt-8 space-y-6 border-t border-forest/5 pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-forest flex items-center gap-2">
          <Database size={18} />
          Manajemen Penyimpanan Lokal
        </h2>
        <p className="text-sm text-[#45544e]">
          Kendalikan data Anda. Seluruh riwayat hanya disimpan di browser ini.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className={isNearLimit ? "text-red-600" : "text-forest/60"}>
            Kapasitas Terpakai: {formatBytes(usedSize)}
          </span>
          <span className="text-forest/40">Estimasi Batas: 5.0 MB</span>
        </div>
        
        <div className="h-2 w-full overflow-hidden rounded-full bg-forest/5">
          <div 
            className={`h-full transition-all duration-500 ${
              isNearLimit ? "bg-red-500" : "bg-forest"
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        {isNearLimit && (
          <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-[11px] font-medium text-red-800 border border-red-100">
            <AlertCircle size={14} className="shrink-0" />
            <p>Penyimpanan browser hampir penuh. Pertimbangkan untuk menghapus riwayat lama atau mengekspor data penting Anda.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-forest/10 bg-white px-4 text-xs font-bold text-forest transition hover:bg-forest/5 active:scale-95 shadow-sm"
        >
          <Download size={14} />
          Ekspor Riwayat (JSON)
        </button>
        
        <div className="relative">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-forest/10 bg-white px-4 text-xs font-bold text-forest transition hover:bg-forest/5 active:scale-95 shadow-sm"
          >
            <Upload size={14} />
            Impor Riwayat
          </button>
        </div>
      </div>

      {importError && (
        <p className="text-[10px] font-bold text-red-600 uppercase">
          Format file impor tidak valid. Pastikan menggunakan file .json hasil ekspor.
        </p>
      )}
    </div>
  );
}
