import { requireAuth } from "@/lib/auth";
import { exportSave } from "@/lib/save/export";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { buffer, filename } = exportSave();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
