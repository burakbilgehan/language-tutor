"use client";

import { useEffect, useRef, useState } from "react";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { useLlmStatus } from "@/lib/llm-status";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { NATIVE_LANGUAGES } from "@/lib/profile-options";
import { chatHistoryApi, chatSend } from "@/lib/client-api";

const nativeLangDisplay = (code: string) =>
  NATIVE_LANGUAGES.find((l) => l.code === code)?.name ?? code;

const S = {
  tr: {
    title: "Kumo ile Sohbet ☁️",
    replyFailed: "Cevap alınamadı",
    genericError: "Bir şeyler ters gitti",
    emptyState:
      "Merhaba! İstediğin dilde yaz — Türkçe sor, Japonca pratik yap, ya da ikisini karıştır.",
    placeholder: "Bir şeyler yaz...",
    send: "Gönder",
    noLlm:
      "Sohbet için bir LLM sağlayıcısı gerekli. Ayarlar → LLM Sağlayıcı bölümünden bağlayabilirsin.",
    genIn: (lang: string) => `${lang} dilinde yazıldı`,
  },
  en: {
    title: "Chat with Kumo ☁️",
    replyFailed: "No reply received",
    genericError: "Something went wrong",
    emptyState:
      "Hi! Write in any language — ask in Turkish, practice Japanese, or mix the two.",
    placeholder: "Type something...",
    send: "Send",
    noLlm:
      "Chat needs an LLM provider. You can connect one in Settings → LLM Provider.",
    genIn: (lang: string) => `Written in ${lang}`,
  },
};

interface Msg {
  role: "user" | "assistant";
  content: string;
  // Native language the message was generated in (T-035). New messages carry
  // the active native language; history keeps its stamp.
  lang?: string;
}

export function ChatPanel() {
  const t = useStrings(S);
  const localize = useLocalizeError();
  const llm = useLlmStatus();
  const nativeLanguage = useProfileMeta()?.nativeLanguage ?? "tr";
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatHistoryApi()
      .then((d) => {
        setSessionId(d.sessionId);
        setMessages(d.messages as Msg[] ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message, lang: nativeLanguage }]);
    setBusy(true);
    try {
      const body = await chatSend({ sessionId, message });
      setSessionId(body.sessionId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: body.reply, lang: nativeLanguage },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${localize(e)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="flex flex-1 flex-col gap-3">
          {messages.length === 0 && !busy && (
            <div className="my-auto text-center text-ink-soft">
              <div className="mb-3 text-5xl">☁️</div>
              <p>{t.emptyState}</p>
            </div>
          )}
          {messages.map((m, i) => {
            const otherLang = m.lang && m.lang !== nativeLanguage ? m.lang : null;
            return (
              <div
                key={i}
                className={`flex max-w-[85%] flex-col gap-1 ${
                  m.role === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                    m.role === "user"
                      ? "bg-accent text-surface rounded-br-md"
                      : "bg-surface shadow-cozy rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
                {otherLang && (
                  <span className="px-1 text-xs text-ink-soft">
                    {t.genIn(nativeLangDisplay(otherLang))}
                  </span>
                )}
              </div>
            );
          })}
          {busy && (
            <div className="flex items-center gap-2 self-start rounded-2xl bg-surface px-4 py-3 shadow-cozy">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-ink-soft"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!llm.configured && (
          <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-soft">
            ☁️ {t.noLlm}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="sticky bottom-4 mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            disabled={!llm.configured}
            className="flex-1 rounded-full border-2 border-surface-2 bg-surface px-5 py-3 shadow-cozy outline-none focus:border-accent disabled:opacity-60"
          />
          <CozyButton
            type="submit"
            disabled={busy || !input.trim() || !llm.configured}
          >
            {t.send}
          </CozyButton>
        </form>
      </main>
    </div>
  );
}
