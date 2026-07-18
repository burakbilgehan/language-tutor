import { NextResponse } from "next/server";
import { importSave, SaveImportError } from "@/lib/save/import";

export const runtime = "nodejs";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB guard

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Dosya okunamadı." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Dosya çok büyük." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    importSave(bytes);
  } catch (err) {
    if (err instanceof SaveImportError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Kayıt yüklenemedi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
