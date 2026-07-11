// Canary: exercises the full provider path (spawn → envelope → zod) with one
// cheap call. Run with: npm run llm:smoke
// Fixture mode: LLM_PROVIDER=fixture npm run llm:smoke

import { z } from "zod";
import { getProvider } from "../src/lib/llm/provider";

const SmokeSchema = z.object({
  greeting_ja: z.string(),
  greeting_tr: z.string(),
});

async function main() {
  const provider = getProvider();
  const started = Date.now();
  if (process.env.LLM_PROVIDER === "fixture") {
    console.log("fixture mode: validating curriculum fixture instead");
    const { CurriculumSchema } = await import("../src/lib/llm/schemas");
    const fs = await import("node:fs");
    const raw = fs.readFileSync("src/lib/llm/fixtures/curriculum.json", "utf8");
    CurriculumSchema.parse(JSON.parse(raw));
    console.log("OK: curriculum fixture valid");
    return;
  }
  const result = await provider.generateJson({
    system: "Kısa ve net cevap ver.",
    prompt:
      'Japonca "merhaba" selamlamasını ver. JSON döndür: {"greeting_ja": "...", "greeting_tr": "türkçe anlamı"}',
    schema: SmokeSchema,
    fixtureKey: "smoke",
    tier: "fast",
  });
  console.log("OK", result, `(${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err.message);
  if (err.rawOutput) console.error("raw:", err.rawOutput.slice(0, 500));
  process.exit(1);
});
