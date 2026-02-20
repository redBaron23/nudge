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
│   ├── index.ts              # Hono server entrypoint
│   ├── config/
│   │   └── env.ts            # Env vars validation (zod)
│   ├── db/
│   │   ├── client.ts         # SQLite + Drizzle setup
│   │   ├── schema.ts         # Drizzle table definitions
│   │   └── migrate.ts        # Migration runner
│   ├── bot/
│   │   └── telegram.ts       # grammY bot + webhook handler
│   ├── ai/
│   │   ├── client.ts         # Anthropic SDK setup
│   │   ├── prompts.ts        # System prompts for onboarding
│   │   └── conversation.ts   # Conversation logic with AI
│   ├── onboarding/
│   │   ├── schema.ts         # Business config types
│   │   ├── flow.ts           # Onboarding flow logic
│   │   └── extractor.ts      # Extract structured data from AI
│   └── types/
│       └── index.ts          # Shared types
└── onboarding/
    └── agenda.yaml           # Declarative: what data to collect
```

## Core Flow

1. Business owner sends message via Telegram
2. Server looks up or creates conversation state in SQLite
3. Claude Haiku receives: onboarding definition + collected data so far + user message
4. AI responds naturally in Argentine Spanish (voseo), asking next relevant question
5. AI extracts structured data from free-text responses
6. State updates in DB, response sent back via Telegram

## Key Design Decisions

- **AI-first extraction:** No rigid forms. AI understands "abrimos de 9 a 18 de lunes a viernes" and extracts structured hours.
- **Declarative onboarding:** YAML files define what to collect. AI figures out how to ask.
- **Webhook-based Telegram:** No polling.
- **Spanish-first:** Argentine Spanish with voseo.
- **SQLite for MVP:** Zero config, single file. Drizzle ORM makes migration to Postgres trivial later.
- **Incremental setup:** Start with bare Hono server, add features one at a time.

## Commands

```bash
pnpm dev          # Dev server with hot reload
pnpm build        # Compile TypeScript
pnpm start        # Run production build
```

## Environment Variables

```
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
WEBHOOK_URL=https://xxx.ngrok.io
```

## Development Roadmap

- [x] Step 1: Hono server running with pnpm dev
- [ ] Step 2: SQLite + Drizzle setup with schema
- [ ] Step 3: Telegram bot connected via webhook
- [ ] Step 4: Claude Haiku integration with conversation loop
- [ ] Step 5: Onboarding YAML parser + flow engine
- [ ] Step 6: End-to-end: chat configures a business agenda
