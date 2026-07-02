import { createWorker } from "tesseract.js";
import { detectCategory } from "./categories";
import type { CategoryId } from "./categories";

export type OcrResult = {
  raw: string;
  date: string | null;
  amount: number | null;
  taxAmount: number | null;
  vendor: string | null;
  invoiceNo: string | null;
  suggestedCategory: CategoryId;
  confidence: number;
};

export async function ocrImage(imagePath: string): Promise<OcrResult> {
  const worker = await createWorker("jpn+eng");
  const { data } = await worker.recognize(imagePath);
  await worker.terminate();

  const text = data.text;
  const confidence = data.confidence;

  return {
    raw: text,
    date: extractDate(text),
    amount: extractAmount(text),
    taxAmount: extractTaxAmount(text),
    vendor: extractVendor(text),
    invoiceNo: extractInvoiceNo(text),
    suggestedCategory: detectCategory(text, extractAmount(text) ?? undefined),
    confidence,
  };
}

// ---- 抽出ロジック ----

function extractAmount(text: string): number | null {
  // 合計・税込・お買上を優先
  const priorityPatterns = [
    /(?:合計|税込|お買上|ご請求)[^\d]*([¥￥\\Y]?\s*[\d,]+)/,
    /(?:total|amount)[^\d]*([¥￥\\Y]?\s*[\d,]+)/i,
  ];
  for (const p of priorityPatterns) {
    const m = text.match(p);
    if (m) return parseJpNumber(m[1]);
  }

  // 最大金額を拾う（領収書の合計が一番大きいことが多い）
  const all = [...text.matchAll(/[¥￥\\Y]\s*([\d,]+)/g)].map(m => parseJpNumber(m[1]));
  if (all.length > 0) return Math.max(...all.filter((n): n is number => n !== null));

  return null;
}

function extractTaxAmount(text: string): number | null {
  const m = text.match(/(?:消費税|税額|内税|外税)[^\d]*([¥￥\\Y]?\s*[\d,]+)/);
  return m ? parseJpNumber(m[1]) : null;
}

function extractDate(text: string): string | null {
  const patterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
    /R\s*(\d+)\s*[\.\-]\s*(\d{1,2})\s*[\.\-]\s*(\d{1,2})/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;

    if (p.source.includes("令和") || p.source.startsWith("R")) {
      const year = 2018 + parseInt(m[1]);
      return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  return null;
}

function extractVendor(text: string): string | null {
  // 最初の行に店名が多い
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 1);
  for (const line of lines.slice(0, 5)) {
    if (/[株式会社|有限会社|合同会社|（株）|㈱]/.test(line)) return line;
    if (line.length > 2 && line.length < 30 && !/[\d¥￥]/.test(line)) return line;
  }
  return lines[0] ?? null;
}

function extractInvoiceNo(text: string): string | null {
  // インボイス登録番号: T + 13桁
  const m = text.match(/T\d{13}/);
  return m ? m[0] : null;
}

function parseJpNumber(s: string): number | null {
  const cleaned = s.replace(/[¥￥\\Y,\s]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}
