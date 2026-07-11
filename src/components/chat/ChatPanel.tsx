"use client";

import { useEffect, useRef, useState } from "react";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CozyButton } from "@/components/shared/CozyButton";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.sessionId);
        setMessages(d.messages ?? []);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Cevap alınamadı");
      setSessionId(body.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: body.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "Bir şeyler ters gitti"}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <StatsHeader title="Kumo ile Sohbet ☁️" backHref="/map" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="flex flex-1 flex-col gap-3">
          {messages.length === 0 && !busy && (
            <div className="my-auto text-center text-ink-soft">
              <div className="mb-3 text-5xl">☁️</div>
              <p>
                Merhaba! İstediğin dilde yaz — Türkçe sor, Japonca pratik yap,
                ya da ikisini karıştır.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "self-end bg-accent text-surface rounded-br-md"
                  : "self-start bg-surface shadow-cozy rounded-bl-md"
              }`}
            >
              {m.content}
            </div>
          ))}
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
            placeholder="Bir şeyler yaz..."
            className="flex-1 rounded-full border-2 border-surface-2 bg-surface px-5 py-3 shadow-cozy outline-none focus:border-accent"
          />
          <CozyButton type="submit" disabled={busy || !input.trim()}>
            Gönder
          </CozyButton>
        </form>
      </main>
    </div>
  );
}
