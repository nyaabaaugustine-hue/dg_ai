"use client";

import { useChat, Chat as AIChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { AlertCircle, Send, User } from "lucide-react";

const AVATAR_URL = "https://res.cloudinary.com/dwsl2ktt2/image/upload/v1786937253/ott_nv3is9.png";

function extractText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

export function Chat() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chat] = useState(
    () => new AIChat({ id: sessionId, transport: new DefaultChatTransport({ api: "/api/chat" }) }),
  );
  const { messages, status, error, sendMessage } = useChat({ chat });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  return (
    <Card className="relative flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_10px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <CardHeader className="border-b bg-gradient-to-r from-black/[0.04] via-transparent to-black/[0.04]">
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Image
              src={AVATAR_URL}
              alt="DEGOONY Assistant"
              width={16}
              height={16}
              className="h-4 w-4 rounded-full object-cover"
            />
          </span>
          DEGOONY SALES INTELLIGENCE — Spare Parts Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {messages.length === 0 && (
          <div className="space-y-3 text-muted-foreground text-sm">
            <p className="rounded-lg border bg-muted/60 px-3 py-2">
              Hello! Welcome to Degoony Evergreen Logistics and Transport Ghana Limited — Ashanti Region, Kumasi, Suame-Makkro. How can I assist you today? Do you have a specific part in mind for your pragia (tuktuk)?
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>“I need a clutch plate.”</li>
              <li>“How much is the carburetor for the Bajaj RE?”</li>
              <li>“What&apos;s the price of a front shock, Pink quality?”</li>
              <li>“Brake shoes for a TVS three-wheeler.”</li>
            </ul>
          </div>
        )}
        {messages.map((m) => {
          const text = extractText(m);
          if (!text.trim()) return null;
          return (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role !== "user" && (
                  <Image
                    src={AVATAR_URL}
                    alt="DEGOONY Assistant"
                    width={20}
                    height={20}
                    className="mt-1 h-5 w-5 shrink-0 rounded-full object-cover text-muted-foreground"
                  />
                )}
              {m.role === "user" && <User className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="animate-pulse">DEGOONY is thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>
      <CardFooter className="border-t p-3">
        <form onSubmit={onSubmit} className="flex w-full gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your parts enquiry… (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] flex-1"
            rows={1}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="self-end">
            <Send className="mr-1 h-4 w-4" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
