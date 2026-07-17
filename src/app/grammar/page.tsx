import { pick } from "@/lib/i18n";
import { getActiveProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const S = {
  tr: { hint: "Soldan bir konu seç — içerik burada açılacak." },
  en: { hint: "Pick a topic on the left — its content will open here." },
};

export default function GrammarIndexPage() {
  const t = pick(S, getActiveProfile()?.uiLanguage);
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
      <div className="text-4xl">🌿</div>
      <p>{t.hint}</p>
    </div>
  );
}
