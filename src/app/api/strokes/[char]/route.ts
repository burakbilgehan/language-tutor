import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// Vendored stroke-order data (animCJK-derived, hanzi-writer format:
// { strokes: string[], medians: number[][][] }). Served from node_modules so
// the 6600-file dataset never touches public/ or the git tree.
const DATA_DIR = path.join(
  process.cwd(),
  "node_modules",
  "@k1low",
  "hanzi-writer-data-jp"
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ char: string }> }
) {
  const raw = decodeURIComponent((await params).char);
  // Exactly one visible character; also blocks any path traversal.
  if ([...raw].length !== 1 || /[./\\]/.test(raw)) {
    return NextResponse.json({ error: "Geçersiz karakter" }, { status: 400 });
  }
  try {
    const json = await readFile(path.join(DATA_DIR, `${raw}.json`), "utf8");
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        // Static dataset — cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Bu karakter için çizim verisi yok" },
      { status: 404 }
    );
  }
}
