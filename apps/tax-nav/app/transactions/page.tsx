"use client";
import { useEffect, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";

type Transaction = {
  id: number;
  date: string;
  amount: number;
  tax_amount: number;
  description: string;
  category_id: CategoryId;
  vendor: string | null;
  invoice_no: string | null;
  invoice_valid: number | null;
  note: string | null;
};

export default function TransactionsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<Transaction>>({});

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    const m = month ? `&month=${month}` : "";
    const res = await fetch(`/api/transactions?year=${year}${m}`);
    setRows(await res.json());
  }

  async function handleDelete(id: number) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    load();
  }

  async function handleSaveEdit() {
    if (!editId) return;
    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, ...editFields }),
    });
    setEditId(null);
    load();
  }

  const totalExpense = rows.filter(r => r.category_id !== "income").reduce((s, r) => s + r.amount, 0);
  const totalIncome = rows.filter(r => r.category_id === "income").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">仕訳帳</h1>
        <div className="flex gap-2 items-center text-sm">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-24">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month ?? ""} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)} className="input w-24">
            <option value="">全月</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card label="収入合計" value={totalIncome} color="text-blue-700" />
        <Card label="経費合計" value={totalExpense} color="text-red-600" />
        <Card label="収支" value={totalIncome - totalExpense} color={totalIncome - totalExpense >= 0 ? "text-green-700" : "text-red-700"} />
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["日付", "勘定科目", "金額", "取引先", "説明", "インボイス", "操作"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">データがありません</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {editId === r.id ? (
                  <>
                    <td className="px-4 py-2"><input type="date" defaultValue={r.date} onChange={e => setEditFields(f => ({ ...f, date: e.target.value }))} className="input w-32" /></td>
                    <td className="px-4 py-2">
                      <select defaultValue={r.category_id} onChange={e => setEditFields(f => ({ ...f, category_id: e.target.value as CategoryId }))} className="input w-32">
                        {Object.entries(CATEGORIES).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="number" defaultValue={r.amount} onChange={e => setEditFields(f => ({ ...f, amount: Number(e.target.value) }))} className="input w-24" /></td>
                    <td className="px-4 py-2"><input type="text" defaultValue={r.vendor ?? ""} onChange={e => setEditFields(f => ({ ...f, vendor: e.target.value }))} className="input w-28" /></td>
                    <td className="px-4 py-2"><input type="text" defaultValue={r.description} onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))} className="input" /></td>
                    <td className="px-4 py-2">—</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button onClick={handleSaveEdit} className="text-blue-600 hover:underline mr-2">保存</button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 hover:underline">戻す</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.category_id === "income" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                        {CATEGORIES[r.category_id]?.label ?? r.category_id}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium tabular-nums ${r.category_id === "income" ? "text-blue-700" : "text-red-600"}`}>
                      {r.category_id === "income" ? "+" : "-"}¥{r.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.vendor ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.description}</td>
                    <td className="px-4 py-3">
                      {r.invoice_no ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.invoice_valid === 1 ? "bg-green-100 text-green-700" : r.invoice_valid === 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                          {r.invoice_valid === 1 ? "✓ 有効" : r.invoice_valid === 0 ? "✗ 無効" : "未照合"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => { setEditId(r.id); setEditFields({}); }} className="text-gray-500 hover:text-blue-600 mr-2 text-xs">編集</button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600 text-xs">削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>¥{value.toLocaleString()}</p>
    </div>
  );
}
