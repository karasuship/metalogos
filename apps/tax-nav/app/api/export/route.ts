import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();
  const format = searchParams.get("format") ?? "freee"; // freee | yayoi | simple

  const rows = db.prepare(
    "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC"
  ).all(`${year}-%`) as any[];

  const csv = buildCsv(rows, format);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-nav-${year}-${format}.csv"`,
    },
  });
}

function buildCsv(rows: any[], format: string): string {
  if (format === "freee") return buildFreeeCsv(rows);
  if (format === "yayoi") return buildYayoiCsv(rows);
  return buildSimpleCsv(rows);
}

// freee形式（公式インポートフォーマット準拠）
function buildFreeeCsv(rows: any[]): string {
  const header = "取引日,決済口座,収支区分,税区分,勘定科目,取引先,金額,税額,備考\n";
  const lines = rows.map(r => {
    const cat = CATEGORIES[r.category_id as keyof typeof CATEGORIES];
    const isIncome = r.category_id === "income";
    return [
      r.date,
      "",
      isIncome ? "収入" : "支出",
      r.tax_amount > 0 ? "課税" : "不課税",
      cat?.label ?? r.category_id,
      r.vendor ?? "",
      r.amount,
      r.tax_amount ?? 0,
      r.description,
    ].join(",");
  });
  return "﻿" + header + lines.join("\n");
}

// 弥生形式
function buildYayoiCsv(rows: any[]): string {
  const header = "伝票日付,借方勘定科目,借方金額,貸方勘定科目,貸方金額,摘要\n";
  const lines = rows.map(r => {
    const cat = CATEGORIES[r.category_id as keyof typeof CATEGORIES];
    const isIncome = r.category_id === "income";
    return [
      r.date.replace(/-/g, "/"),
      isIncome ? "売掛金" : cat?.label ?? r.category_id,
      isIncome ? r.amount : "",
      isIncome ? "売上高" : "現金",
      isIncome ? "" : r.amount,
      r.description,
    ].join(",");
  });
  return "﻿" + header + lines.join("\n");
}

// シンプル形式（税理士渡し用）
function buildSimpleCsv(rows: any[]): string {
  const header = "日付,金額,消費税,勘定科目,取引先,説明,インボイス番号\n";
  const lines = rows.map(r => {
    const cat = CATEGORIES[r.category_id as keyof typeof CATEGORIES];
    return [
      r.date,
      r.amount,
      r.tax_amount ?? 0,
      cat?.label ?? r.category_id,
      r.vendor ?? "",
      r.description,
      r.invoice_no ?? "",
    ].join(",");
  });
  return "﻿" + header + lines.join("\n");
}
