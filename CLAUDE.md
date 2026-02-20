# CLAUDE.md — Nudge

## What is Nudge?

Nudge is a conversational AI onboarding system. Business owners configure their business by chatting with an AI assistant instead of filling out forms.

The AI asks the right questions, understands natural language responses, and builds a structured business configuration automatically.

**"Configure your entire business by just chatting."**

## Current Phase: MVP

First use case: **appointment scheduling configuration** — the AI guides a business owner through setting up services, schedules, staff, and booking rules via Telegram chat.

The pattern is extensible to any onboarding flow (support, CRM, inventory, etc).

## Architecture

```
Telegram Bot → Hono API Server → Claude Haiku (Anthropic API) → SQLite (Drizzle ORM)
```

Layered internals:

```
Bot handlers / API routes (thin controllers)
    └─→ OnboardingService (orchestration + business logic)
            ├─→ AIService (Claude API calls: chat + extraction)
            ├─→ ConversationRepository (conversations table)
            ├─→ MessageRepository (messages table)
            ├─→ prompts.ts (pure functions — prompt building)
            └─→ flow.ts (pure functions — agenda loading + helpers)
```

## Tech Stack

- **Runtime:** Node.js + TypeScript (ESM)
- **HTTP:** Hono + @hono/node-server
- **AI:** Anthropic API — Claude Haiku
- **Messaging:** Telegram Bot API via grammY
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Validation:** Zod
- **Package Manager:** pnpm
- **Dev:** tsx (watch mode), tsc (build)

## Project Structure

```
nudge/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env
├── src/
│   ├── index.ts              # Hono server + API routes
│   ├── config/
│   │   ├── env.ts            # Env vars validation (zod)
│   │   └── constants.ts      # Derived env (webhook URL resolution)
│   ├── db/
│   │   ├── client.ts         # SQLite + Drizzle setup
│   │   └── schema.ts         # Drizzle table definitions
│   ├── bot/
│   │   └── telegram.ts       # grammY bot + webhook handler
│   ├── ai/
│   │   ├── client.ts         # Anthropic SDK setup
│   │   └── prompts.ts        # System prompt builders (pure functions)
│   ├── onboarding/
│   │   ├── schema.ts         # Agenda + CollectedData types
│   │   └── flow.ts           # Agenda loader + completion helpers (pure functions)
│   ├── repositories/
│   │   ├── conversation.repository.ts  # DB access for conversations
│   │   └── message.repository.ts       # DB access for messages
│   └── services/
│       ├── ai.service.ts               # Claude API: chat + extraction
│       └── onboarding.service.ts       # Orchestrates the full onboarding flow
└── onboarding/
    └── agenda.yaml           # Declarative: what data to collect
```

## Core Flow

1. Business owner sends message via Telegram
2. `OnboardingService` looks up or creates conversation in SQLite
3. Claude Haiku receives: system prompt (agenda + collected data + status) + message history + user message
4. AI responds naturally in Argentine Spanish (voseo), asking next relevant question
5. A second Claude call extracts structured data from the exchange
6. State updates in DB, response sent back via Telegram

**Status transitions:** `active` → `reviewing` → `completed`
- **active:** AI asks questions, extraction fills `collectedData`
- **reviewing:** All fields collected — AI presents a summary for confirmation
- **completed:** User confirmed — conversation is locked

## Key Design Decisions

- **AI-first extraction:** No rigid forms. AI understands "abrimos de 9 a 18 de lunes a viernes" and extracts structured hours.
- **Declarative onboarding:** YAML files define what to collect. AI figures out how to ask.
- **Webhook-based Telegram:** No polling.
- **Spanish-first:** Argentine Spanish with voseo.
- **SQLite for MVP:** Zero config, single file. Drizzle ORM makes migration to Postgres trivial later.
- **Incremental setup:** Start with bare Hono server, add features one at a time.

## Bot Commands

- `/start` — Begin onboarding (or restart if already completed)
- `/reiniciar` — Reset conversation and start over

## API Routes

- `GET /` — Health check
- `POST /webhook` — Telegram webhook
- `GET /api/conversations` — List all conversations with parsed `collectedData`
- `GET /api/conversations/:chatId` — Get a single conversation by Telegram chat ID

## Commands

```bash
pnpm dev          # Dev server with hot reload
pnpm build        # Compile TypeScript
pnpm start        # Run production build
pnpm db:push      # Push schema changes to SQLite
```

## Environment Variables

```
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
WEBHOOK_URL=https://xxx.ngrok.io
```

## Coding Conventions

- **Repositories** for DB access — singleton classes, one per table (e.g. `ConversationRepository`)
- **Services** for business logic — singleton classes that orchestrate repos + AI (e.g. `OnboardingService`)
- **Bot handlers / API routes** stay thin — delegate to services immediately
- **Pure functions** for stateless logic — `prompts.ts` (prompt builders), `flow.ts` (agenda helpers)

## Development Roadmap

- [x] Step 1: Hono server running with pnpm dev
- [x] Step 2: SQLite + Drizzle setup with schema
- [x] Step 3: Telegram bot connected via webhook
- [x] Step 4: Claude Haiku integration with conversation loop
- [x] Step 5: Onboarding YAML parser + flow engine
- [x] Step 6: End-to-end: chat configures a business agenda
