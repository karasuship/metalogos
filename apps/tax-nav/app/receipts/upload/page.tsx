"use client";
import { useState, useRef } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";

type OcrResult = {
  raw: string;
  date: string | null;
  amount: number | null;
  taxAmount: number | null;
  vendor: string | null;
  invoiceNo: string | null;
  suggestedCategory: CategoryId;
  confidence: number;
  savedPath: string;
  fileName: string;
};

type FormState = {
  date: string;
  amount: string;
  tax_amount: string;
  description: string;
  category_id: CategoryId;
  vendor: string;
  invoice_no: string;
  note: string;
};

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setSaved(false);
    setOcr(null);
    setPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/ocr", { method: "POST", body: fd });
    const data: OcrResult = await res.json();
    setOcr(data);
    setForm({
      date: data.date ?? new Date().toISOString().slice(0, 10),
      amount: data.amount?.toString() ?? "",
      tax_amount: data.taxAmount?.toString() ?? "",
      description: "",
      category_id: data.suggestedCategory,
      vendor: data.vendor ?? "",
      invoice_no: data.invoiceNo ?? "",
      note: "",
    });
    setLoading(false);
  }

  async function checkInvoice() {
    if (!form?.invoice_no) return;
    setInvoiceStatus("checking");
    const res = await fetch(`/api/invoice?no=${form.invoice_no}`);
    const data = await res.json();
    setInvoiceStatus(data.valid ? "valid" : "invalid");
    if (data.name && !form.vendor) setForm(f => f ? { ...f, vendor: data.name } : f);
  }

  async function handleSave() {
    if (!form || !ocr) return;
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseInt(form.amount),
        tax_amount: parseInt(form.tax_amount || "0"),
        receipt_path: ocr.savedPath,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setOcr(null);
      setPreview(null);
      setForm(null);
      setInvoiceStatus("idle");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">領収書・請求書を追加</h1>

      {/* ドロップゾーン */}
      {!ocr && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-600 font-medium">画像をドラッグ＆ドロップ、またはクリックして選択</p>
          <p className="text-gray-400 text-sm mt-1">JPG / PNG / PDF 対応</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin text-3xl mb-3">⚙️</div>
          <p>OCR処理中...</p>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium text-center">
          ✅ 保存しました。続けて追加できます。
          <button onClick={() => setSaved(false)} className="ml-4 text-sm underline">次の領収書を追加</button>
        </div>
      )}

      {/* OCR結果確認フォーム */}
      {ocr && form && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左：プレビュー */}
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="領収書" className="w-full rounded-lg border border-gray-200 object-contain max-h-96" />
            )}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">OCR生テキスト（確認用）</p>
              <pre className="whitespace-pre-wrap leading-relaxed">{ocr.raw}</pre>
            </div>
            <p className="text-xs text-gray-400">認識精度: {ocr.confidence.toFixed(1)}%</p>
          </div>

          {/* 右：入力フォーム */}
          <div className="space-y-4">
            <Field label="日付 *" required>
              <input type="date" value={form.date}
                onChange={e => setForm(f => f ? { ...f, date: e.target.value } : f)}
                className="input" />
            </Field>

            <Field label="金額（税込）*" required>
              <div className="flex gap-2">
                <input type="number" placeholder="5500" value={form.amount}
                  onChange={e => setForm(f => f ? { ...f, amount: e.target.value } : f)}
                  className="input flex-1" />
                <span className="self-center text-gray-500 text-sm">円</span>
              </div>
            </Field>

            <Field label="うち消費税">
              <div className="flex gap-2">
                <input type="number" placeholder="500" value={form.tax_amount}
                  onChange={e => setForm(f => f ? { ...f, tax_amount: e.target.value } : f)}
                  className="input flex-1" />
                <span className="self-center text-gray-500 text-sm">円</span>
              </div>
            </Field>

            <Field label="勘定科目 *" required>
              <select value={form.category_id}
                onChange={e => setForm(f => f ? { ...f, category_id: e.target.value as CategoryId } : f)}
                className="input">
                {Object.entries(CATEGORIES).map(([id, { label }]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              {form.category_id === "unknown" && (
                <p className="text-xs text-amber-600 mt-1">⚠️ 自動判定できませんでした。手動で選択してください。</p>
              )}
            </Field>

            <Field label="取引先・店名">
              <input type="text" placeholder="株式会社〇〇" value={form.vendor}
                onChange={e => setForm(f => f ? { ...f, vendor: e.target.value } : f)}
                className="input" />
            </Field>

            <Field label="概要・説明 *" required>
              <input type="text" placeholder="交通費（渋谷→新宿）" value={form.description}
                onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)}
                className="input" />
            </Field>

            <Field label="インボイス登録番号">
              <div className="flex gap-2">
                <input type="text" placeholder="T1234567890123" value={form.invoice_no}
                  onChange={e => setForm(f => f ? { ...f, invoice_no: e.target.value } : f)}
                  className="input flex-1" />
                <button onClick={checkInvoice} disabled={!form.invoice_no || invoiceStatus === "checking"}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm rounded-lg text-gray-700 disabled:opacity-50 whitespace-nowrap">
                  {invoiceStatus === "checking" ? "照合中..." : "照合"}
                </button>
              </div>
              {invoiceStatus === "valid" && <p className="text-xs text-green-600 mt-1">✅ 有効な登録番号です</p>}
              {invoiceStatus === "invalid" && <p className="text-xs text-red-600 mt-1">❌ 無効または未登録の番号です</p>}
            </Field>

            <Field label="メモ">
              <input type="text" placeholder="備考があれば" value={form.note}
                onChange={e => setForm(f => f ? { ...f, note: e.target.value } : f)}
                className="input" />
            </Field>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave}
                disabled={!form.date || !form.amount || !form.description}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-40 transition-colors">
                保存する
              </button>
              <button onClick={() => { setOcr(null); setPreview(null); setForm(null); setInvoiceStatus("idle"); }}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
