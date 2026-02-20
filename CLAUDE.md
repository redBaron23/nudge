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
                ┌── Telegram (grammY) ──────┐
                │                            ▼
User chats ─────┤                     Hono API Server
                │                       │        │
                └── WhatsApp (Baileys) ──┘        │
                       (future)             ▼          ▼
                                       Claude Haiku    SQLite
                                            │
                                  ┌─────────┴─────────┐
                                  │  Onboarding Mode   │  Support Mode
                                  │  (configure biz)   │  (answer FAQs)
                                  └────────────────────┘
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
    └── examples/
        └── appointment-scheduling.json  # Example onboarding definition
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

## Modes

### Onboarding (current)
Guides business owner through setup. Loads a JSON definition that describes what data to collect. AI asks questions, extracts structured data, builds config.

### Support (future)
Answers customer FAQs based on a knowledge base provided by the SaaS. Same conversation engine, different system prompt and no data extraction.

## Key Design Decisions

- **AI-first extraction:** No rigid forms. AI understands "abrimos de 9 a 18 de lunes a viernes" and extracts structured hours.
- **Configurable onboarding:** JSON definition files describe what data to collect. Each SaaS client provides their own definition (appointment scheduling, camping registration, etc). The AI adapts automatically — no code changes needed per client.
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

### Done
- [x] Hono server running with pnpm dev
- [x] SQLite + Drizzle setup with schema
- [x] Telegram bot connected via webhook
- [x] Claude Haiku integration with conversation loop
- [x] Onboarding flow with YAML parser + extraction
- [x] End-to-end: chat configures a business agenda

### Next
- [ ] Configurable onboarding: JSON definitions instead of hardcoded YAML (multi-tenant)
- [ ] Deploy to Railway
- [ ] WhatsApp channel via Baileys (same conversation engine)
- [ ] Basic support mode (answer FAQs from a knowledge base)
