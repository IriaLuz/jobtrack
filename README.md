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

Follow these steps in order. Every command is meant to be copied as it is.

### What you need

| Tool | Version | Check with |
|---|---|---|
| Git | any | `git --version` |
| Node.js | 24 (npm comes with it) | `node -v` |
| Docker Desktop | any recent version, **running** | `docker info` |

The easiest way to get Node 24 is [nvm](https://github.com/nvm-sh/nvm): the repository's `.nvmrc`
tells it which version to use.

The app uses three ports on your machine: **5433** (database), **3000** (API) and **5173** (web
app; if it is taken, Vite picks the next free one and prints it).

### 1. Get the code

```bash
git clone https://github.com/IriaLuz/jobtrack.git
```

```bash
cd jobtrack
```

### 2. Use Node 24

```bash
nvm install
```

`node -v` should now print `v24.x.x`. Run `nvm use` in every new terminal you open for this project.

### 3. Start the database

```bash
docker compose up -d db
```

`docker compose ps` should show the `db` service as `healthy` after a few seconds. The first time,
this also creates a second, empty database (`jobtrack_test`) that the integration tests use.

### 4. Set up and start the API (terminal 1)

```bash
cd server
```

```bash
npm install
```

```bash
cp .env.example .env
```

Open `server/.env` and replace the `JWT_SECRET` value with a long random string (the secret that
signs login tokens). This command prints one you can paste:

```bash
openssl rand -base64 48
```

Optional: put an Anthropic API key in `ANTHROPIC_API_KEY` to switch on AI questions and grading.
Without it everything still works, and practice questions come from the built-in question bank.

Create the tables:

```bash
npx prisma migrate deploy
```

Start the API:

```bash
npm run dev
```

You should see `jobtrack API listening on http://localhost:3000`. Leave this terminal running.
To check it from another terminal:

```bash
curl http://localhost:3000/api/health
```

It answers `{"status":"ok"}`.

### 5. Start the web app (terminal 2)

Open a second terminal in the `jobtrack` folder (not `server`):

```bash
nvm use
```

```bash
npm install
```

```bash
npm run dev
```

Open the address Vite prints, usually http://localhost:5173. Vite forwards every `/api` request to
the API on port 3000, so there is nothing else to configure.

### 6. Try it

1. Choose **Create an account** and sign up with any email and a password of 8 or more characters.
2. Choose **Add application**, fill in company, role and a link starting with `https://`.
3. Drag the card to another column, or change its status with **Edit**.
4. Choose **Practise**, then **New question**, write an answer and submit it.

### Stop it

Press `Ctrl+C` in both terminals, then stop the database (your data is kept for next time):

```bash
docker compose stop db
```

To delete all local data and start from scratch:

```bash
docker compose down -v
```

### If something goes wrong

| You see | Why | Fix |
|---|---|---|
| `port is already allocated` when starting the database | another program uses port 5433 | change `"5433:5432"` in `docker-compose.yml` and the port in `server/.env` and `server/.env.test` |
| `Invalid environment configuration` when starting the API | `server/.env` is missing, or `JWT_SECRET` is shorter than 32 characters | redo the `cp .env.example .env` step and set the secret |
| `Can't reach database server` (migrations), or `ECONNREFUSED` in the API terminal and "Something went wrong" in the app | the database is not running | `docker compose up -d db` |
| `EBADENGINE` warnings, or tests refusing to start | wrong Node version | `nvm use` |
| "Something went wrong" right after deleting the local data | the browser still holds a login token for a user that no longer exists | choose **Sign out** and create the account again |
| The web app opens on port 5174 | port 5173 was taken | nothing to fix: use the address Vite printed |

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
