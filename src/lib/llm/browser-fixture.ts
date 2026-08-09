"use client";

// Statik mod fixture sağlayıcısı (T-069 ön koşulu 1): sunucudaki
// FixtureProvider'ın tarayıcı aynası. fs yok; fixtures/ içeriği sync-assets'in
// ürettiği commit'li bundle.json'dan gelir. Bu modüle TEK giriş
// browser-provider'daki NEXT_PUBLIC_LLM_FIXTURE guard'lı dinamik import'tur:
// bayrak build'de inline edildiği için prod'da dal ölü kod olur ve bu chunk
// (bundle.json dahil) hiç üretilmez. Buraya statik import ekleme.
import bundle from "./fixtures/bundle.json";
import {
  type GenerateJsonOptions,
  type GenerateTextOptions,
  LlmError,
} from "./provider-types";
import type { Gen } from "@/core/llm-gen";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fixtureBrowserGen: Gen = {
  async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
    await sleep(300); // loading state'ler dev'de görünür kalsın (sunucuyla aynı)
    const raw = (bundle.json as Record<string, unknown>)[opts.fixtureKey];
    if (raw === undefined) {
      throw new LlmError(`Fixture eksik: ${opts.fixtureKey}.json`);
    }
    return opts.schema.parse(raw);
  },
  async generateText(opts: GenerateTextOptions): Promise<string> {
    await sleep(300);
    const raw = (bundle.text as Record<string, string>)[opts.fixtureKey];
    if (raw === undefined) {
      throw new LlmError(`Fixture eksik: ${opts.fixtureKey}.txt`);
    }
    return raw;
  },
};
