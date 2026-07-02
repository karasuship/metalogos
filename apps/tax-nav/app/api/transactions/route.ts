import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();
  const month = searchParams.get("month");

  let query = "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC";
  const pattern = month
    ? `${year}-${month.padStart(2, "0")}-%`
    : `${year}-%`;

  const rows = db.prepare(query).all(pattern);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const { date, amount, tax_amount, description, category_id, vendor, invoice_no, receipt_path, note } = body;

  if (!date || !amount || !description || !category_id) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO transactions (date, amount, tax_amount, description, category_id, vendor, invoice_no, receipt_path, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, amount, tax_amount ?? 0, description, category_id, vendor ?? null, invoice_no ?? null, receipt_path ?? null, note ?? null);

  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "IDが必要です" }, { status: 400 });

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  const values = [...Object.values(fields), id];

  db.prepare(`UPDATE transactions SET ${sets}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "IDが必要です" }, { status: 400 });

  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
