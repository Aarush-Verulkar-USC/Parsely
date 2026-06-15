# Parsely

LLM-powered invoice extraction with human sign-off.

Upload a PDF or image invoice, let an LLM extract the structured fields, then review and approve (or correct) before exporting.

## Stack

- **Next.js 16** — frontend + API routes
- **PostgreSQL + Drizzle ORM** — data persistence
- **Anthropic / OpenAI** — vision LLM for field extraction (auto-detected from whichever key is set)

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, and at least one LLM API key
   ```

3. **Set up the database**
   ```bash
   npm run db:push
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing auth tokens |
| `ANTHROPIC_API_KEY` | Anthropic API key (preferred) |
| `OPENAI_API_KEY` | OpenAI API key (fallback) |
| `EXTRACTION_PROVIDER` | Force `anthropic`, `openai`, or `mock` |
| `EXTRACTION_MODEL` | Override the default model |

See `.env.example` for all options.

## Deployment

Vercel + Neon (or any Postgres host) is the easiest path. Set the environment variables in your hosting dashboard and run `npm run db:push` against the production database before the first deploy.

> **Note:** The default storage backend writes files to the local filesystem (`STORAGE_DIR`). Swap `src/lib/storage.ts` for an S3-compatible implementation before deploying to a serverless environment.
