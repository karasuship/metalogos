import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// 国税庁インボイス照合API
const INVOICE_API = "https://invoice.e-tax.nta.go.jp/api/1/invoice/";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const no = searchParams.get("no");

  if (!no || !/^T\d{13}$/.test(no)) {
    return NextResponse.json({ error: "番号形式が不正です（T+13桁）" }, { status: 400 });
  }

  try {
    const res = await fetch(`${INVOICE_API}${no}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ valid: false, no });
    }

    const data = await res.json();
    const valid = data?.registrations?.length > 0;
    const name = data?.registrations?.[0]?.name ?? null;

    // DBにキャッシュ
    const db = getDb();
    db.prepare(
      "UPDATE transactions SET invoice_valid = ? WHERE invoice_no = ?"
    ).run(valid ? 1 : 0, no);

    return NextResponse.json({ valid, no, name });
  } catch {
    return NextResponse.json({ error: "照合に失敗しました" }, { status: 500 });
  }
}
