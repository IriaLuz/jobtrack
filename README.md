# jobtrack

Track job applications on a Kanban board and practise for the interviews with an AI coach that
keeps working when the AI does not.

- **Board:** add, edit, delete and drag applications between Saved, Applied, Interviewing, Offered and Rejected.
- **Interview practice:** get a question tailored to the role, answer it, get a score and feedback.
  If the AI is slow or down, you get a question from a hand-written bank and your answer is kept
  until grading is available again.
- **Accounts:** each user only ever sees their own applications.

The full design, the reasoning behind every decision and a step-by-step rebuild guide are in
[docs/PLAN.md](docs/PLAN.md).

## Stack

| | |
|---|---|
| Web | React 19, TypeScript (strict), Tailwind CSS 4, TanStack Query 5, Vite |
| API | Node.js 24, Express 5, Zod 4, Prisma 7, PostgreSQL 17, JWT, Anthropic API |
| Tests | Vitest, React Testing Library, Supertest, Playwright |
| Ops | Sentry, Docker (local DB and CI containers), GitHub Actions, Vercel |

```
/          web app (Vite)        server/   API (Express)        e2e/   Playwright tests
src/       React code            server/src/domain           business rules, no framework code
docs/      plan and decisions    server/src/infrastructure   Prisma, JWT, bcrypt, Anthropic
                                 server/src/http             routes, auth, validation, errors
```

## Run it locally

You need Node 24 (`nvm use` reads `.nvmrc`) and Docker. The database listens on port **5433**,
so it never clashes with another PostgreSQL you may already run on 5432.

```bash
nvm use
```

```bash
docker compose up -d db
```

Then the API, in one terminal:

```bash
cd server && cp .env.example .env && npm install && npx prisma migrate dev && npm run dev
```

And the web app, in another:

```bash
npm install && npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the API on port 3000.
Add `ANTHROPIC_API_KEY` to `server/.env` to switch on AI questions and grading; without it the app
uses the fallback question bank.

## Tests

| Command | Where | Needs |
|---|---|---|
| `npm test` | web components (RTL + jsdom) | nothing |
| `npm test` in `server/` | domain rules and request validation | nothing |
| `npm run test:integration` in `server/` | HTTP API against PostgreSQL (`jobtrack_test`) | `docker compose up -d db` |
| `npm run test:e2e` | the whole app in Chromium, on ports 3100 and 4173 | the database, and `npx playwright install chromium` once |

`npm run lint` and `npm run typecheck` work in both packages. Locally, E2E uses the database in
`server/.env` and leaves its test accounts there (`e2e-...@example.com`).

## Deploying

CI (`.github/workflows/ci.yml`) runs every check in containers on each pull request. On `main`,
after everything passes, it migrates the production database and deploys both Vercel projects.

One-time setup:

1. Create a PostgreSQL database (e.g. Neon or Vercel Postgres). Serverless functions open many
   short-lived connections, so give the API the **pooled** connection string, and give migrations
   the **direct** one.
2. Create two Vercel projects from this repository:
   - `jobtrack-api` with **Root Directory** `server`. Environment variables: `DATABASE_URL` (pooled),
     `JWT_SECRET` (32+ random characters), optionally `ANTHROPIC_API_KEY` and `SENTRY_DSN`.
   - `jobtrack-web` with Root Directory `.`. Optional environment variable: `VITE_SENTRY_DSN`.
3. Replace `your-api-project.invalid` in the root `vercel.json` with the API's production URL
   (the rewrite forwards `/api/*` from the web app to the API, so the browser only ever talks to
   one origin). The web deploy refuses to run until you do.
4. Turn off Vercel's automatic Git deployments for both projects, so only CI deploys.
5. In the Anthropic Console, set a monthly **spend limit** on the API key's workspace. It is the
   overall cost cap: once it is reached the API refuses requests and the app falls back to the
   question bank, exactly as when the AI is down. (The API also limits each user to 30 AI
   requests an hour and each email to 10 sign-in attempts per 15 minutes.)
6. Add these GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID`,
   `VERCEL_WEB_PROJECT_ID`, `PRODUCTION_DATABASE_URL` (direct, used only for migrations).

### First deploy checklist

Nothing below can be checked from a laptop, so do it once after the first deploy:

1. `https://<web domain>/api/health` returns `{"status":"ok"}`: the rewrite reaches the API.
2. Create an account, add an application, drag it to another column, reload: it stays.
3. Open Practise, choose "New question": with `ANTHROPIC_API_KEY` set, the question must **not**
   say "From our question bank". Answer it and get a score.
4. The browser console shows no Content-Security-Policy errors.
5. On a preview deployment, set `ANTHROPIC_API_KEY` to an invalid value and ask for a question:
   you still get one (from the bank), and Sentry receives the "AI question writing failed" warning.
