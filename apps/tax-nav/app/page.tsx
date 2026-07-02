"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

type Row = { date: string; amount: number; tax_amount: number; category_id: string };

export default function Dashboard() {
  const year = new Date().getFullYear();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/transactions?year=${year}`).then(r => r.json()).then(setRows);
  }, [year]);

  const totalIncome  = rows.filter(r => r.category_id === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = rows.filter(r => r.category_id !== "income").reduce((s, r) => s + r.amount, 0);

  // 月別集計
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    const mo = rows.filter(r => r.date.slice(5, 7) === m);
    return {
      label: `${i + 1}月`,
      income:  mo.filter(r => r.category_id === "income").reduce((s, r) => s + r.amount, 0),
      expense: mo.filter(r => r.category_id !== "income").reduce((s, r) => s + r.amount, 0),
    };
  });
  const maxBar = Math.max(...byMonth.map(m => Math.max(m.income, m.expense)), 1);

  // 費目別集計
  const byCat: Record<string, number> = {};
  rows.filter(r => r.category_id !== "income").forEach(r => {
    byCat[r.category_id] = (byCat[r.category_id] ?? 0) + r.amount;
  });
  const catTotals = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{year}年 ダッシュボード</h1>
        <Link href="/receipts/upload"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + 領収書を追加
        </Link>
      </div>

      {/* 収支サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="年間収入" value={totalIncome} color="text-blue-700" />
        <StatCard label="年間経費" value={totalExpense} color="text-red-600" />
        <StatCard label="課税所得（概算）" value={totalIncome - totalExpense}
          color={(totalIncome - totalExpense) >= 0 ? "text-green-700" : "text-red-700"} />
      </div>

      {/* 扶養の壁 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">扶養の壁チェック</h2>
        <div className="space-y-3">
          <WallBar label="103万の壁（所得税の扶養）" current={totalIncome} limit={1_030_000} />
          <WallBar label="130万の壁（社会保険の扶養）" current={totalIncome} limit={1_300_000} />
          <WallBar label="150万の壁（配偶者特別控除）" current={totalIncome} limit={1_500_000} />
        </div>
        <p className="text-xs text-gray-400 mt-3">※ 概算です。正確な判定は税理士にご確認ください。</p>
      </div>

      {/* 月別グラフ */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">月別収支</h2>
        <div className="flex items-end gap-1.5 h-36">
          {byMonth.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-center justify-end gap-0.5" style={{ height: "112px" }}>
                {m.income > 0 && (
                  <div className="w-full bg-blue-300 rounded-sm"
                    style={{ height: `${(m.income / maxBar) * 100}%` }} />
                )}
                {m.expense > 0 && (
                  <div className="w-full bg-red-300 rounded-sm"
                    style={{ height: `${(m.expense / maxBar) * 100}%` }} />
                )}
              </div>
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span><span className="inline-block w-3 h-3 bg-blue-300 rounded mr-1" />収入</span>
          <span><span className="inline-block w-3 h-3 bg-red-300 rounded mr-1" />経費</span>
        </div>
      </div>

      {/* 費目別内訳 */}
      {catTotals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">経費内訳（{year}年）</h2>
          <div className="space-y-2.5">
            {catTotals.map(([cat_id, total]) => {
              const pct = Math.round((total / totalExpense) * 100);
              return (
                <div key={cat_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{CATEGORIES[cat_id as keyof typeof CATEGORIES]?.label ?? cat_id}</span>
                    <span className="text-gray-600 tabular-nums">¥{total.toLocaleString()} <span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📄</p>
          <p className="font-medium">まだデータがありません</p>
          <p className="text-sm mt-1">領収書を追加してください</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>¥{value.toLocaleString()}</p>
    </div>
  );
}

function WallBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = Math.min((current / limit) * 100, 100);
  const over = current >= limit;
  const near = pct >= 80 && !over;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium tabular-nums ${over ? "text-red-600" : near ? "text-amber-600" : "text-gray-600"}`}>
          ¥{current.toLocaleString()} / ¥{(limit / 10000).toFixed(0)}万
          {over && " ⚠️ 超過"}
          {near && " ⚡ 注意"}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${over ? "bg-red-400" : near ? "bg-amber-400" : "bg-green-400"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
