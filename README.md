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
