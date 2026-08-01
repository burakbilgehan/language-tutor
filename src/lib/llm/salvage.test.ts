import { test } from "node:test";
import assert from "node:assert/strict";
import { LessonSchema, salvageLessonContent } from "./schemas";
import { runJsonWithRetry } from "./shared-pure";

// 2026-08-01 canlı kilidin regresyon testi: superRefine sözleşmesini ihlal
// eden TEK alıştırma dersi öldürmemeli; kurtarma onu atıp dersi geçirmeli.

const validEx = (i: number) => ({
  type: "mcq",
  prompt_tr: `Soru ${i}?`,
  options: ["a", "b", "c", "d"],
  answer: "a",
});

const lesson = {
  title_tr: "Test dersi",
  explanation_tr: "Açıklama",
  examples: [
    { target: "犬", reading: "inu", translation_tr: "köpek" },
    { target: "猫", reading: "neko", translation_tr: "kedi" },
  ],
  grammar_notes: [],
  vocab: [],
  exercises: [
    validEx(1),
    validEx(2),
    validEx(3),
    validEx(4),
    // sözleşme ihlali: answer, options'ta yok
    { ...validEx(5), answer: "seçeneklerde-yok" },
    // sözleşme ihlali: translate ama accept_also boş
    { type: "translate", prompt_tr: "Çevir", target_text: "犬", answer: "köpek" },
  ],
};

test("salvageLessonContent bozuk alıştırmaları atar, >=4 kalırsa ders geçer", () => {
  const saved = salvageLessonContent(lesson);
  const parsed = LessonSchema.safeParse(saved);
  assert.ok(parsed.success);
  assert.equal(parsed.data.exercises.length, 4);
});

test("salvage 4'ün altına düşerse ham çıktıyı aynen döner (kurtarma yok)", () => {
  const thin = { ...lesson, exercises: lesson.exercises.slice(2) };
  assert.equal(salvageLessonContent(thin), thin);
});

test("runJsonWithRetry: ilk denemede salvage başarılıysa retry çağrılmaz", async () => {
  let calls = 0;
  const result = await runJsonWithRetry(
    {
      prompt: "p",
      schema: LessonSchema,
      salvage: salvageLessonContent,
      fixtureKey: "lesson",
      tier: "balanced" as const,
    },
    async () => {
      calls++;
      return JSON.stringify(lesson);
    }
  );
  assert.equal(calls, 1);
  assert.equal(result.exercises.length, 4);
});
