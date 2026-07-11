import path from "node:path";
import fs from "node:fs";
import {
  type LlmProvider,
  type GenerateJsonOptions,
  type GenerateTextOptions,
  LlmError,
} from "./provider";

const FIXTURE_DIR = path.join(process.cwd(), "src", "lib", "llm", "fixtures");

function readFixture(key: string, ext: "json" | "txt"): string {
  const file = path.join(FIXTURE_DIR, `${key}.${ext}`);
  if (!fs.existsSync(file)) {
    throw new LlmError(`Fixture eksik: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

export class FixtureProvider implements LlmProvider {
  async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
    await sleep(300); // keep loading states visible in dev
    const raw = readFixture(opts.fixtureKey, "json");
    return opts.schema.parse(JSON.parse(raw));
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    await sleep(300);
    return readFixture(opts.fixtureKey, "txt");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
