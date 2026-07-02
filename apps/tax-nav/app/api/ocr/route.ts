import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { ocrImage } from "@/lib/ocr";
import { RECEIPTS_DIR } from "@/lib/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}.${ext}`;
  const filePath = path.join(RECEIPTS_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const result = await ocrImage(filePath);

  return NextResponse.json({
    ...result,
    savedPath: filePath,
    fileName,
  });
}
