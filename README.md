# DEGOONY SALES INTELLIGENCE

Ghanaian spare-parts intelligence and sales assistant for Bajaj (tuk-tuk) and TVS three-wheeler parts. Customers chat with the AI on the homepage; the admin team manages parts, prices, vehicles, manufacturers, conversations, and feedback under `/admin`.

## What it does for the company

- **AI sales assistant** — answers customer enquiries in chat with real data, in GH₵, per quality grade (Pink, Yellow, Forte/Endurance)
- **Parts search & pricing** — live database lookup by name, alias, or part number; never hallucinates prices (tool-forced)
- **Compatibility checks** — verifies a part fits specific vehicles (Bajaj RE, TVS King, etc.)
- **Add-on / upsell recommendations** — complementary parts, commonly replaced items, upgrades to grow order value
- **Engineering knowledge** — fitting notes, wear patterns, and service advice from the knowledge base
- **Conversation intelligence** — every chat is stored; review enquiries, AI responses, and human feedback in the admin panel
- **Price intelligence** — quality-grade pricing, price sources, and active/effective-dated price management

## Tools the AI has access to

| Tool | Purpose |
|---|---|
| `search_parts(query, limit)` | Search parts by name/alias/part number, returns prices per grade |
| `get_part_details(partId)` | Full part record: manufacturer, aliases, prices, compatibility |
| `check_compatibility(partId, vehicle)` | Does the part fit the vehicle? |
| `find_related_parts(partId)` | Complementary/replacement/upgrade parts for add-on sales |
| `get_engineering_knowledge(query)` | Fitting and service knowledge |
| `search_manufacturer(name)` | Manufacturer lookups |

## AI configuration (Cloudflare Workers AI)

Set in `.env` (never commit it):

```
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_API_TOKEN="..."
CLOUDFLARE_FAST_MODEL="@cf/meta/llama-4-scout-17b-16e-instruct"
CLOUDFLARE_THINKING_MODEL="@cf/openai/gpt-oss-120b"
```

- `/api/chat` — streaming chat with tool calling (function loop, up to 4 rounds)
- `/api/brain` — test endpoint (`GET` status, `POST` fast/thinking brain)
- The API token is read server-side only and never sent to the browser.

## Getting Started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and Cloudflare credentials
npx prisma migrate dev # apply database schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin panel: `/admin` (credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Stack

Next.js 16 (App Router, Turbopack) · Prisma 7 + Neon Postgres · AI SDK v7 (`ai`, `@ai-sdk/react`) · Cloudflare Workers AI · Tailwind CSS v4 · shadcn-style UI.