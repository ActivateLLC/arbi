# Repository Overview

This repository contains **Arbi**, an autonomous arbitrage engine built as a pnpm monorepo. Use this guide to quickly locate key components and supporting documentation.

## Code Layout
- **apps/api** – Express + TypeScript REST API exposing arbitrage endpoints and health checks.
- **apps/web** – React front-end for customer-facing dashboards.
- **packages/arbitrage-engine** – Core arbitrage logic including scouts, analyzers, and risk management routines.
- **packages/ai-engine** – OpenAI Agents SDK integrations that power opportunity analysis and decisioning.
- **packages/web-automation** – Playwright-based scraping and automation helpers for sourcing opportunities.
- **packages/voice-interface** – Whisper/ElevenLabs powered voice interaction tooling.
- **packages/transaction** – Hyperswitch payment processor integration utilities.
- **packages/data** – Data access layer for PostgreSQL and Redis.
- **scripts/get-ebay-api-key.ts** – Utility script to automate eBay API key creation.

## Getting Started
1. Install prerequisites: Node.js 18+ and pnpm 8+.
2. Install dependencies: `pnpm install`.
3. Build all packages: `pnpm build`.
4. Configure environment: copy `.env.example` to `.env` and add your `EBAY_APP_ID`.
5. Start API server: `cd apps/api && node dist/index.js`.

## Useful References
- **README.md** – High-level feature overview, revenue model, and REST API examples.
- **docs/** – Deployment instructions, launch checklists, and Amazon API alternatives.
- **QUICKSTART_EBAY.md** – Five-minute guide for setting up eBay credentials.
- **ENHANCEMENT_ROADMAP.md** – Planned ML/RL improvements.

## Notes
- Default risk controls include per-opportunity, daily, and monthly budget limits.
- Opportunity scoring uses a 0-100 point system to filter and prioritize trades.
- The platform’s business model assumes a 25% commission on realized profits.
