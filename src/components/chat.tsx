"use client";

import { useChat, Chat as AIChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { Send, Sparkles, Wrench, Tag, ShieldCheck, ChevronRight } from "lucide-react";

const AVATAR_URL = "https://res.cloudinary.com/dwsl2ktt2/image/upload/v1786937253/ott_nv3is9.png";

const SUGGESTIONS = [
  { icon: Tag, label: "Clutch plate price" },
  { icon: Wrench, label: "Carburetor for Bajaj RE" },
  { icon: ShieldCheck, label: "Front shock, Pink quality" },
  { icon: Sparkles, label: "Brake shoes TVS" },
];

function extractText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

const URL_RE_SOURCE = String.raw`(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)`;
const PHONE_RE_SOURCE = String.raw`[+(]?[+(]?\d[\d\s()-]{6,}\d`;

function looksLikePhone(part: string, before: string): boolean {
  if (/GH|₵|,|%|x/i.test(part)) return false;
  if (/[₵$€£]/.test(before.slice(-2))) return false;
  const digits = part.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return false;
  const trimmed = part.trim();
  if (!/^\d/.test(trimmed.replace(/^[+(.\s]+/, ""))) return false;
  return /[+(]/.test(trimmed) || /^0\d/.test(trimmed);
}

function toWhatsAppHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) {
    let national = digits.slice(3);
    if (national.startsWith("0")) national = national.slice(1);
    return `https://wa.me/233${national}`;
  }
  if (digits.startsWith("0")) return `https://wa.me/233${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function linkify(text: string, isUser: boolean): React.ReactNode[] {
  const linkClass = `font-medium underline underline-offset-2 transition ${
    isUser ? "text-white hover:text-emerald-50" : "text-emerald-400 hover:text-emerald-300"
  }`;

  const nodes: React.ReactNode[] = [];
  let key = 0;
  const link = (href: string, label: string) => (
    <a key={`l${key++}`} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {label}
    </a>
  );

  const pushPlain = (segment: string) => {
    const phoneRe = new RegExp(PHONE_RE_SOURCE, "g");
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = phoneRe.exec(segment)) !== null) {
      const raw = m[0];
      const before = segment.slice(0, m.index);
      if (looksLikePhone(raw, before)) {
        if (m.index > cursor) nodes.push(<span key={`s${key++}`}>{segment.slice(cursor, m.index)}</span>);
        nodes.push(link(toWhatsAppHref(raw), raw));
        cursor = m.index + raw.length;
      }
    }
    if (cursor < segment.length) nodes.push(<span key={`s${key++}`}>{segment.slice(cursor)}</span>);
  };

  const urlRe = new RegExp(URL_RE_SOURCE, "g");
  let last = 0;
  let u: RegExpExecArray | null;
  while ((u = urlRe.exec(text)) !== null) {
    let raw = u[0];
    const trailing = raw.match(/[.,;:!?]+$/);
    if (trailing) raw = raw.slice(0, -trailing[0].length);
    if (raw.length === 0) continue;

    if (u.index > last) pushPlain(text.slice(last, u.index));
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    nodes.push(link(href, raw));
    if (trailing) nodes.push(<span key={`s${key++}`}>{trailing[0]}</span>);
    last = u.index + u[0].length;
  }
  if (last < text.length) pushPlain(text.slice(last));

  return nodes;
}

const THINKING_STEPS = [
  "Thinking…",
  "Searching the inventory…",
  "Checking prices & stock…",
  "Finding matching parts…",
];

/* ------------------------------------------------------------------ */
/*  Thinking indicator — sweeter, breathing avatar + shimmer + orbit   */
/* ------------------------------------------------------------------ */

function ThinkingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % THINKING_STEPS.length), 1700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="msg-in flex items-start gap-3">
      <div className="relative mt-1 h-8 w-8 shrink-0">
        <span className="absolute inset-[-4px] rounded-full bg-emerald-400/25 blur-[6px] avatar-breathe" />
        <div className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-emerald-400/30 avatar-breathe">
          <Image src={AVATAR_URL} alt="" width={32} height={32} className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-3xl rounded-tl-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)]">
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/50" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
        </span>
        <span
          key={step}
          className="thinking-shimmer step-fade bg-gradient-to-r from-white/40 via-white/90 to-white/40 bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent"
        >
          {THINKING_STEPS[step]}
        </span>
        <span className="flex items-end gap-1">
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:-0.3s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:-0.15s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400/80" />
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typewriter — reveals assistant replies slowly, word by word        */
/* ------------------------------------------------------------------ */

// Word + its trailing whitespace, so join() reproduces spacing/newlines exactly.
function splitIntoWords(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

const WORD_DELAY_MIN_MS = 90;
const WORD_DELAY_MAX_MS = 170;

function useTypewriter(
  id: string,
  fullText: string,
  animate: boolean,
  doneIds: React.MutableRefObject<Set<string>>,
) {
  const alreadyDone = doneIds.current.has(id);
  const [wordCount, setWordCount] = useState(
    !animate || alreadyDone ? splitIntoWords(fullText).length : 0,
  );

  useEffect(() => {
    if (!animate || alreadyDone) {
      setWordCount(splitIntoWords(fullText).length);
      return;
    }
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout>;

    function tick() {
      if (cancelled) return;
      setWordCount((prev) => {
        const total = splitIntoWords(fullText).length;
        if (prev >= total) {
          doneIds.current.add(id);
          return prev;
        }
        return prev + 1;
      });
      // Slight randomness per word so the pace feels hand-typed, not robotic.
      const jitter = WORD_DELAY_MIN_MS + Math.random() * (WORD_DELAY_MAX_MS - WORD_DELAY_MIN_MS);
      handle = setTimeout(tick, jitter);
    }
    handle = setTimeout(tick, WORD_DELAY_MIN_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, animate, alreadyDone, id]);

  return splitIntoWords(fullText).slice(0, wordCount).join("");
}

function AssistantBubble({
  id,
  text,
  animate,
  streaming,
  doneIds,
}: {
  id: string;
  text: string;
  animate: boolean;
  streaming: boolean;
  doneIds: React.MutableRefObject<Set<string>>;
}) {
  const display = useTypewriter(id, text, animate, doneIds);
  const stillTyping = display.length < text.trimEnd().length;
  const showCaret = animate && (streaming || stillTyping);
  return (
    <>
      {linkify(display, false)}
      {showCaret && (
        <span className="caret-blink ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] rounded-full bg-emerald-400" />
      )}
    </>
  );
}

export function Chat({ className }: { className?: string }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chat] = useState(
    () => new AIChat({ id: sessionId, transport: new DefaultChatTransport({ api: "/api/chat" }) }),
  );
  const { messages, status, error, sendMessage } = useChat({ chat });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const typedIdsRef = useRef<Set<string>>(new Set());

  const isLoading = status === "submitted" || status === "streaming";

  const lastAssistantText = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return extractText(messages[i]);
    }
    return "";
  })();

  // Only auto-scroll if the user is already near the bottom, so reading
  // older messages while a reply streams in doesn't get yanked away.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  }

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, lastAssistantText]);

  function submitText(text: string) {
    const t = text.trim();
    if (!t || isLoading) return;
    setInput("");
    stickToBottomRef.current = true;
    sendMessage({ text: t });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0e12] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)_inset] ${className ?? "h-[calc(100vh-8rem)]"}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(16,185,129,0.12),transparent_70%)]" />

      <header className="relative z-10 flex items-center gap-3 border-b border-white/8 bg-black/20 px-5 py-4 backdrop-blur-xl">
        <div className="relative">
          <div
            className={`h-10 w-10 overflow-hidden rounded-full ring-2 transition-all duration-500 ${
              isLoading ? "ring-emerald-400/70 avatar-breathe" : "ring-emerald-500/40"
            }`}
          >
            <Image src={AVATAR_URL} alt="DEGOONY" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c0e12] transition-colors duration-300 ${
              isLoading ? "bg-amber-400" : "bg-emerald-400"
            }`}
          >
            {isLoading && <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping" />}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-wide text-white">DEGOONY Assistant</h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/25">
              AI
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-white/40">
            {isLoading ? (
              <span className="thinking-shimmer bg-gradient-to-r from-white/30 via-white/70 to-white/30 bg-[length:200%_100%] bg-clip-text text-transparent">
                typing a reply…
              </span>
            ) : (
              "Spare-parts intelligence · Kumasi, Ghana"
            )}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 space-y-5 overflow-y-auto px-5 py-6"
      >
        {error && (
          <div className="msg-in rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error.message}
          </div>
        )}

        {messages.length === 0 && (
          <div className="space-y-5">
            <div className="msg-in rounded-3xl rounded-tl-lg border border-white/8 bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-white/70">
              Welcome to <span className="font-medium text-white">Degoony Evergreen Logistics</span> — Ashanti Region, Kumasi, Suame-Makkro. Ask about any part for your pragia (tuktuk).
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => submitText(s.label)}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="suggestion-in group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/60 transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-emerald-500/8 hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(16,185,129,0.4)]"
                >
                  <s.icon className="h-4 w-4 shrink-0 text-emerald-400/70 transition group-hover:text-emerald-400" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const text = extractText(m);
          if (!text.trim()) return null;
          const isUser = m.role === "user";
          const isLast = idx === messages.length - 1;
          const animate = !isUser && isLast;
          return (
            <div key={m.id} className={`msg-in flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              {!isUser && (
                <div className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  <Image src={AVATAR_URL} alt="" width={32} height={32} className="h-full w-full object-cover" />
                </div>
              )}
              <div
                className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? "rounded-br-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]"
                    : "rounded-tl-lg border border-white/8 bg-white/[0.04] text-white/85"
                }`}
              >
                {isUser ? (
                  linkify(text, true)
                ) : (
                  <AssistantBubble
                    id={m.id}
                    text={text}
                    animate={animate}
                    streaming={status === "streaming"}
                    doneIds={typedIdsRef}
                  />
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" || (status === "streaming" && !lastAssistantText.trim()) ? (
          <ThinkingIndicator />
        ) : null}
        <div ref={bottomRef} />
      </div>

      <footer className="relative z-10 border-t border-white/8 bg-black/30 px-4 py-4 backdrop-blur-xl">
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <div className="relative flex-1 rounded-3xl border border-white/10 bg-white/[0.04] transition focus-within:border-emerald-500/40 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about a part, price, or compatibility…"
              className="min-h-[48px] max-h-32 resize-none border-0 bg-transparent px-4 py-3.5 text-sm text-white shadow-none placeholder:text-white/30 focus-visible:ring-0"
              rows={1}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-12 w-12 shrink-0 rounded-full bg-emerald-500 text-black shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-all duration-200 hover:scale-105 hover:bg-emerald-400 active:scale-95 disabled:scale-100 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-[10px] tracking-wide text-white/25">
          Enter to send · Shift+Enter for new line
        </p>
      </footer>

      <style>{`
        @keyframes thinking-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        .thinking-shimmer { animation: thinking-shimmer 1.8s linear infinite; }

        @keyframes caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .caret-blink { animation: caret-blink 0.9s step-end infinite; }

        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .msg-in { animation: msg-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes suggestion-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .suggestion-in { animation: suggestion-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes avatar-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .avatar-breathe { animation: avatar-breathe 1.6s ease-in-out infinite; }

        @keyframes step-fade {
          from { opacity: 0; filter: blur(2px); }
          to { opacity: 1; filter: blur(0); }
        }
        .step-fade { animation: step-fade 0.25s ease-out both; }
      `}</style>
    </div>
  );
}
