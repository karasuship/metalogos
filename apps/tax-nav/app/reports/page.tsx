"use client";
import { useState } from "react";

const FORMATS = [
  { id: "freee",  label: "freee形式",   desc: "freeeにそのままインポートできます" },
  { id: "yayoi", label: "弥生形式",     desc: "弥生会計にそのままインポートできます" },
  { id: "simple", label: "シンプル形式", desc: "税理士に渡す用の整理済みCSV" },
];

export default function ReportsPage() {
  const year = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(year);
  const [format, setFormat] = useState("simple");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    const res = await fetch(`/api/export?year=${selectedYear}&format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-nav-${selectedYear}-${format}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-bold text-gray-800">レポート出力</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">対象年度</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input w-32">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">出力形式</label>
          <div className="space-y-2">
            {FORMATS.map(f => (
              <label key={f.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${format === f.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="format" value={f.id} checked={format === f.id}
                  onChange={() => setFormat(f.id)} className="mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-800">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
          {downloading ? "出力中..." : "CSVをダウンロード"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">税理士に渡す場合</p>
        <p className="text-amber-700">「シンプル形式」でダウンロードして、そのままメールに添付してください。インボイス番号の照合結果も含まれています。</p>
      </div>
    </div>
  );
}
