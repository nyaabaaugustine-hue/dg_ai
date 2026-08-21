import Link from "next/link";
import { Chat } from "@/components/chat";

const CAPABILITIES = [
  {
    title: "Parts search & pricing",
    desc: "Searches the live parts database by name, alias, or part number and quotes real prices per quality grade (Pink, Yellow, Forte/Endurance) in GH₵.",
  },
  {
    title: "Compatibility checks",
    desc: "Confirms a part fits specific vehicles — Bajaj RE, RE MAX, TVS King, and more — using the compatibility database.",
  },
  {
    title: "Add-on & upsell recommendations",
    desc: "Suggests complementary parts, commonly replaced items, and upgrades to grow every sale (e.g. clutch plate → pressure plate, bearing, cable).",
  },
  {
    title: "Engineering knowledge",
    desc: "Answers fitting/service questions from the engineering knowledge base: installation notes, wear patterns, and maintenance advice.",
  },
  {
    title: "Manufacturer lookups",
    desc: "Resolves manufacturer and brand questions (Bajaj, TVS, OEM suppliers).",
  },
  {
    title: "Conversation intelligence",
    desc: "Every enquiry and answer is recorded for the admin team — review conversations, feedback, and pricing history in /admin.",
  },
];

const TOOL_LIST = [
  "search_parts(query, limit)",
  "get_part_details(partId)",
  "check_compatibility(partId, vehicle)",
  "find_related_parts(partId)",
  "get_engineering_knowledge(query)",
  "search_manufacturer(name)",
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DEGOONY SALES INTELLIGENCE</h1>
          <p className="text-sm text-foreground/70">Ghanaian spare-parts intelligence and sales assistant</p>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-foreground/80 shadow-sm backdrop-blur-md transition hover:bg-white/95"
        >
          Admin
        </Link>
      </div>
      <div className="mb-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur-md">
        <h2 className="text-sm font-semibold text-foreground/90">What DEGOONY can do for your company</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm">
              <p className="font-medium text-foreground">{c.title}</p>
              <p className="mt-0.5 text-xs text-foreground/70">{c.desc}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-foreground/60">
          <span className="font-medium">Database tools available to the AI:</span>{" "}
          <code className="rounded bg-black/5 px-1">{TOOL_LIST.join("  ·  ")}</code>
        </p>
      </div>
      <Chat />
    </main>
  );
}