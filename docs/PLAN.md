# jobtrack: the plan to finish the project

> A principal engineer's plan: **what** we build, **which files** change, **how** each piece works
> and **why** we chose it. It doubles as a step-by-step guide to rebuild everything yourself with
> another agent guiding you (section 0).
>
> Reference implementation (the "answer key"): branch `feature/full-stack-jobtrack`.

---

## 0. How to use this plan

Rebuild the project phase by phase (section 10), on a fresh branch from `main`. Each phase is one
commit and ends green. Paste this to the guiding agent at the start of each session:

> Read `CLAUDE.md` and `docs/PLAN.md`. Guide me through Phase N, one step at a time. For each step,
> explain the concept and the *why* first (use frontend analogies), then let me write the code.
> Review what I wrote, ask guiding questions, give hints before solutions, and only show the
> reference implementation from branch `feature/full-stack-jobtrack` if I ask. Do not move on
> until the step's "Verify" command passes.

---

## 1. Where we started, where we are going

**Start (`main`):** a Vite + React 19 + TypeScript + Tailwind app rendering a Kanban board from
`src/mocks/jobs.ts`. No backend, persistence, auth, tests or CI. One hidden type error (see 10.1).

**Goal:** make every line of the CV true:

| CV claim | What makes it true |
|---|---|
| AI exercise generator and grader with graceful degradation (timeouts, fallbacks, output validation, off-task guardrails) | `server/src/domain/exercises/*` + `server/src/infrastructure/anthropicExerciseAi.ts` |
| Node.js, Express, PostgreSQL, Prisma REST API | `server/`: Express 5, Prisma 7 + `@prisma/adapter-pg`, PostgreSQL 17 |
| Zod boundary validation | requests (`http/schemas.ts`), environment (`config.ts`), LLM output (`domain/exercises/aiOutput.ts`) |
| Per-user JWT auth | `authService` + `jwtTokens` + `requireAuth`; every query is scoped by `userId` |
| Domain logic decoupled from Express, unit-testable without an HTTP server | `server/src/domain/**` imports neither Express nor Prisma; 53 unit tests run with no DB or network |
| Kanban UI in React 19, strict TS, Tailwind, TanStack Query | `src/pages/board-page`, `src/components/*`, `src/hooks/useJobs.ts` |
| Union types that prevent invalid states at compile time | `OpenDialog`, `Exercise` (status union), `Record<Status, string>`, `AuthMode`, `ButtonVariant` |
| Vitest, Supertest, RTL, Playwright E2E, Sentry | 53 + 30 server tests, 29 web tests, 3 E2E tests, `@sentry/react` + `@sentry/node` |
| Dockerised GitHub Actions deploying to Vercel | `.github/workflows/ci.yml`: every job runs in a container; deploy jobs ship to two Vercel projects |

---

## 2. Principles, and where you can see them

- **KISS / YAGNI.** Every piece answers a real need. Section 12 lists what we deliberately left
  out and the trigger that would justify adding it.
- **Single Responsibility.** `jobService` holds job rules, `prismaJobRepository` talks to the
  database, `jobRoutes` translates HTTP into service calls. If a file needs "and" to describe it, split it.
- **Dependency Inversion.** The domain declares the interfaces it needs (`JobRepository`,
  `ExerciseAi`, `PasswordHasher`, `TokenIssuer`); infrastructure implements them; the composition
  root wires them. *Frontend analogy:* a component that receives `onSave` as a prop instead of calling `fetch`.
- **Interface Segregation.** Ports are 1-5 methods and owned by their consumer.
  `exerciseService` only needs `Pick<JobService, "getJob">`; `readJsonOutput` only needs
  `Pick<Anthropic.Message, "stop_reason" | "content">`.
- **Make invalid states unrepresentable.** Discriminated unions instead of bags of optional fields.
- **Validate at the boundary, trust inside.** HTTP bodies, env vars and LLM output are parsed with
  Zod once, where they enter. Inside, types are trusted.
- **Third parties are unreliable.** The LLM can be slow, down, wrong or manipulated; the user
  journey must work anyway.
- **Self-explanatory names.** `getAuthenticatedUserId`, `pickFallbackQuestion`, `grading_unavailable`,
  `wireServices`. No `utils.ts`, `data`, `handle()`.

---

## 3. Architecture

```
Browser (React SPA, Vercel project "jobtrack-web")
  └─ fetch("/api/...") ── vercel.json rewrite ──▶ Vercel project "jobtrack-api" (Express app as one function)
                                                    ├─ http/            routes, requireAuth, Zod request schemas, errorHandler
                                                    ├─ domain/          services + ports, plain TypeScript
                                                    └─ infrastructure/  Prisma repositories, JWT, bcrypt, Anthropic
                                                           └─ PostgreSQL (Neon / Vercel Postgres; Docker locally)
```

Repository layout:

```
/                       web app, unchanged location so your history stays readable
  src/                  React code
  e2e/                  Playwright tests (web + API + DB together)
server/                 the API: an independent Node package (own package.json, lockfile, ESLint, tsconfig)
  prisma/               schema + migrations
  src/domain/           business rules, no framework imports
  src/infrastructure/   adapters: Prisma, JWT, bcrypt, Anthropic
  src/http/             the Express adapter
  src/app.ts            createApp(services): builds the Express app; tests call it
  src/compositionRoot.ts  wireServices(adapters) and buildApp(config)
  src/index.ts          local entry: listen on PORT
  api/index.ts          Vercel entry: export default buildApp()
docker-compose.yml      local PostgreSQL (dev + test databases)
.github/workflows/ci.yml
```

Decisions:

- **Two independent packages, not npm workspaces.** The mental model stays "frontend project +
  backend project", each deployable on its own (two Vercel projects with different root
  directories). Workspaces would save an `npm ci` but add hoisting rules and a shared lockfile.
  Revisit when the two share code.
- **Same-origin `/api`, no CORS.** Dev: Vite proxies `/api` to `localhost:3000`. Production:
  the web project's `vercel.json` rewrites `/api/*` to the API project. The browser only ever
  talks to one origin, so there is no CORS policy to get wrong.
- **Node 24.** Node 20 reached end-of-life in April 2026 and current Vitest, jsdom and Prisma need
  22.12+. `.nvmrc` pins 24 (Active LTS); both `package.json` files declare `"engines": { "node": "24.x" }`, which Vercel reads.
- **ESM with `module: nodenext` on the server.** Node's native module system. The cost: relative
  imports end in `.js` (`import { x } from "./x.js"`) even though the file is `x.ts`, because
  that is the file that exists at runtime.
- **No build step for the API.** `tsx` runs TypeScript locally and in E2E; Vercel compiles
  `api/index.ts` itself; `tsc --noEmit` type-checks. Nothing reads a `dist/` folder, so none is produced.

---

## 4. Data model (`server/prisma/schema.prisma`)

```prisma
enum JobStatus      { saved applied interviewing offered rejected }
enum QuestionSource { ai question_bank }
enum ExerciseStatus { unanswered graded off_task grading_unavailable }

model User           { id (uuid), email @unique, passwordHash, createdAt, jobApplications[] }
model JobApplication { id, userId -> User (onDelete: Cascade), company, role, status @default(saved),
                       link, salary?, location?, notes?, createdAt, updatedAt @updatedAt, exercises[]
                       @@index([userId, updatedAt]) }
model Exercise       { id, jobApplicationId -> JobApplication (onDelete: Cascade), question, questionSource,
                       status @default(unanswered), answer?, score?, feedback?, createdAt, updatedAt
                       @@index([jobApplicationId, createdAt]) }
model RateLimit      { key @id, windowStartedAt, hits }
```

- **UUID ids**, so ids cannot be guessed or enumerated.
- **Cascade deletes**: deleting a job deletes its exercises.
- **Indexes match the queries**: "a user's jobs, newest first" and "a job's exercises, newest first".
- **Exercises are persisted, so the server owns the question.** If the client sent
  `{ question, answer }` to a grading endpoint, anyone could use our paid LLM as a free general
  proxy by inventing "questions". Persisting also gives the practice panel a history.
- **Flat columns in the database, a union in the code.** The table stores
  `status/answer/score/feedback`; `prismaExerciseRepository.toExercise()` converts each row into
  the `Exercise` union and throws if a row is inconsistent (e.g. `graded` without a score).
- **Rate-limit counters live in PostgreSQL**, the one store every serverless instance shares.
  One row per key, restarted at 1 when a new window begins, so the table never grows beyond the
  keys in use. No Redis: one less service to run and pay for.
- **Prisma 7 specifics:** `generator client { provider = "prisma-client", output = "../src/generated/prisma", moduleFormat = "esm", importFileExtension = "js" }`,
  the datasource URL lives in `prisma.config.ts` (read with `process.env.DATABASE_URL`, not
  Prisma's `env()` helper, so `prisma generate` works before a `.env` exists), and the client
  needs a driver adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.

---

## 5. REST API

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/health` | no | | `200 { status: "ok" }` |
| POST | `/api/auth/register` | no | `{ email, password }` | `201 { token, user }` · `400` · `409` |
| POST | `/api/auth/login` | no | `{ email, password }` | `200 { token, user }` · `401` · `429` |
| GET | `/api/jobs` | yes | | `200 JobApplication[]`, most recently updated first |
| POST | `/api/jobs` | yes | job fields | `201 JobApplication` |
| PATCH | `/api/jobs/:jobId` | yes | any subset of job fields | `200 JobApplication` · `404` |
| DELETE | `/api/jobs/:jobId` | yes | | `204` · `404` |
| GET | `/api/jobs/:jobId/exercises` | yes | | `200 Exercise[]`, newest first |
| POST | `/api/jobs/:jobId/exercises` | yes | | `201 Exercise` (AI or question-bank question) · `429` |
| POST | `/api/exercises/:exerciseId/answer` | yes | `{ answer }` | `200 Exercise` (graded, off_task or grading_unavailable) · `429` |

Errors always look like `{ "error": { "message": string, "fieldErrors"?: Record<string, string[]> } }`.

- **404, not 403, for other users' resources.** A 403 would confirm the id exists.
- **PATCH for both "edit" and "drag to another column".** One endpoint, partial updates. A
  missing field is unchanged; an empty optional field is cleared (`""` becomes `null`); `{}` is a no-op.
- **Zod strips unknown keys**, so a client cannot set `id` or `userId` (mass-assignment protection).
- **`link` must be http(s).** `z.url()` alone accepts `javascript:alert(1)`, which would become a
  clickable XSS link on the card.
- **Emails are trimmed and lower-cased** before saving and comparing.
- **Passwords: at least 8 characters and at most 72 bytes.** bcrypt silently ignores everything
  after 72 bytes, and an accented letter or emoji takes 2-4 bytes, so the limit is counted in bytes.
- **Rate limits** (429 with a `Retry-After` header and "Try again in N minutes"):
  sign-in, 10 attempts per email per 15 minutes (brute force); AI routes, 30 requests per user per
  hour (cost). Keyed by email and user id, **not IP**: behind Vercel's proxy and rewrite the client
  IP cannot be verified, and a wrong guess would put every user in one shared bucket. The overall
  cost cap is the Anthropic workspace spend limit (no code; when hit, the AI fallback kicks in).

---

## 6. Backend, file by file

### Configuration
- `server/src/config.ts`: Zod-parses `process.env` once at startup. Missing `DATABASE_URL` or a
  `JWT_SECRET` under 32 characters crashes immediately with a readable message. Optional values
  (`ANTHROPIC_API_KEY`, `SENTRY_DSN`) treat an empty string as "not set".

### Domain (no Express, no Prisma)
- `domain/errors.ts`: `NotFoundError`, `ConflictError`, `AuthenticationError`. The domain throws
  *meaning*; the HTTP layer picks the status code.
- `domain/jobs/jobApplication.ts`: `JOB_STATUSES`, `JobApplication`, `JobApplicationDetails`,
  `JobApplicationChanges`, the `JobRepository` port (every method takes `userId`).
- `domain/jobs/jobService.ts`: `createJobService(jobRepository)` returns `listJobs`, `getJob`,
  `createJob`, `updateJob`, `deleteJob`. Rule: "not yours" and "does not exist" look the same.
- `domain/auth/user.ts`: `User`, `Credentials`, `AuthSession` and the ports `UserRepository`
  (its `create` throws `ConflictError` for a taken email; the unique index is the only race-free
  place to enforce that), `PasswordHasher`, `TokenIssuer`.
- `domain/auth/authService.ts`: `register` and `login`. Login gives the same message for an
  unknown email and a wrong password.
- `domain/exercises/exercise.ts`: the `Exercise` union, `ExerciseRepository`, `QuestionContext`
  (only company, role and notes go to the AI) and the `ExerciseAi` port, which returns `unknown`
  on purpose: LLM output is untrusted input.
- `domain/exercises/aiOutput.ts`: Zod schemas for what the model must return. The adapter uses
  them to constrain generation and the service re-validates with them.
- `domain/exercises/withTimeout.ts`: runs a task with an `AbortSignal` and rejects after N ms
  *even if the task ignores the signal*. This is the guarantee behind "slow upstream never blocks".
- `domain/exercises/questionBank.ts`: 8 hand-written fallback questions, personalised as
  "the <role> role" (never "a <role>", which gave "a Engineer").
- `domain/exercises/exerciseService.ts`: graceful degradation in one helper, `askAi()`: no AI,
  timeout, network error, refusal or schema violation all return `null` (and log a warning).
  - `generateExercise`: 10 s budget, otherwise the question bank. The user always gets a question.
  - `submitAnswer`: saves the answer as `grading_unavailable` **before** the AI call, so neither an
    AI failure nor a server crash mid-request can lose it (no extra state: the existing one is
    exactly true until a grade arrives). Then 15 s to grade; a verdict of
    `addressesQuestion: false` becomes `off_task`.

*Frontend analogy:* services are custom hooks without React: plain functions closing over their
dependencies and returning an object of functions. `createJobService(repo)` ≈ `useJobs()`.

### Infrastructure (adapters)
- `prismaClient.ts`: `createPrismaClient(databaseUrl)` with the `PrismaPg` driver adapter.
- `prismaJobRepository.ts`: ownership is part of every `where`, and `updateManyAndReturn` /
  `deleteMany` make "check the owner and change the row" a single atomic query.
- `prismaUserRepository.ts`: maps Prisma's unique-violation code `P2002` to `ConflictError`.
- `prismaExerciseRepository.ts`: flattens the attempt union into columns and back (`toExercise`).
- `prismaHitCounter.ts`: one `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement that
  starts a new window at 1 or adds a hit, atomically, so two simultaneous requests can never both
  slip through as "the 10th".
- `bcryptPasswordHasher.ts`: `bcryptjs` (pure JS: no native build on CI or Vercel), cost 12;
  integration tests pass cost 4 to stay fast.
- `jwtTokens.ts`: HS256, `sub = userId`, 7-day expiry, algorithm pinned on verify (stops
  "alg confusion" attacks). Expired or malformed tokens give `null`; anything else is rethrown.
- `anthropicExerciseAi.ts`: the only file that knows we use Anthropic.
  - `client.messages.create` with `output_config: { effort: "low", format: zodOutputFormat(schema) }`
    (structured outputs constrain the reply to our JSON schema; low effort keeps it fast).
  - Model `claude-opus-5-5` by default, configurable with `ANTHROPIC_MODEL`. `maxRetries: 1`,
    because the domain's timeout is the real budget and it aborts the request through `signal`.
  - `readJsonOutput()`: any `stop_reason` other than `end_turn` (`refusal`, `max_tokens`) is a failure.
  - Prompt-injection guardrails: user text is wrapped in `<job>`, `<question>`, `<answer>` tags,
    `escapeTags()` stops it from closing those tags, and the system prompt says the content is
    data and that attempts to instruct the grader are off-task.
  - Server-side refusal fallbacks (re-running on another model) are deliberately off: our own
    fallback already handles a refusal, and a second model call would break the latency budget.

### HTTP adapter
- `http/schemas.ts`: Zod request schemas. Note `createJobSchema` adds `.default("saved")` on top
  of a shared `jobFields` object, and `updateJobSchema = z.object(jobFields).partial()` has no
  defaults: a default inside a partial schema would silently reset fields on every PATCH.
- `http/requireAuth.ts`: reads `Authorization: Bearer <token>`, stores the user id in
  `res.locals`; `getAuthenticatedUserId(res)` reads it back with a runtime check.
- `http/rateLimiter.ts`: `createRateLimiter(hitCounter, { name, maxHits, windowMs, message })`
  returns `{ check(key) }`, which throws `TooManyRequestsError` over the limit. Fixed windows: the
  simplest algorithm (a burst across a window boundary can briefly allow 2x, which is fine here).
  `HitCounter` is the one-method storage port. Routes call `check()` *after* validating the
  input, so login is limited by the normalised email.
- `http/errorHandler.ts`: `ZodError` → 400 (first message + `fieldErrors`), `AuthenticationError` → 401,
  `NotFoundError` → 404, `ConflictError` → 409, `TooManyRequestsError` → 429 + `Retry-After`,
  JSON-parser errors → their 4xx. Anything else is
  reported to Sentry and answered with a generic 500: no stack traces or SQL reach the client.
- `http/routes/*.ts`: parse, call one service method, send. No business logic.
- `app.ts`: `createApp(services)`. Defines the two rate limits (the policy, in one place).
  Routes registered after `app.use("/api", requireAuth(...))` need a token.
- `compositionRoot.ts`: `wireServices(adapters)` connects services to adapters (integration tests
  call it with a test DB and a fake AI); `buildApp(config)` builds the real adapters, Sentry and logger.

---

## 7. Frontend, file by file

- `index.html`: removed the link to a `/src/style.css` that did not exist.
- `vite.config.js`: `/api` proxy (target overridable with `API_PROXY_TARGET`, used by E2E), the
  Vitest config (jsdom, `src/test/setup.ts`), and `preview.headers` read from `vercel.json`, so the
  E2E run serves exactly the production security headers.
- `vercel.json`: the `/api` rewrite and the security headers: a Content-Security-Policy
  (`default-src 'self'` covers scripts, styles and fonts; `connect-src` adds Sentry; `object-src`,
  `base-uri`, `form-action` and `frame-ancestors` are set because they do not fall back to
  `default-src`) and `X-Content-Type-Options: nosniff`. The CSP is what limits the damage an XSS
  could do with the token in `localStorage`.
- `src/index.css`: semantic colour tokens (`--surface`, `--surface-raised`, `--success`,
  `--warning`, `--danger`) for light and dark mode, and element styles inside `@layer base`.
  **Why the layer:** Tailwind v4 puts utilities in a cascade layer and *unlayered CSS always beats
  layered CSS*, so the old unlayered `h1 { font-size: 56px }` silently overrode every `text-*`
  class. Removed the template leftovers (`#social`, `.counter`, the fixed 1126px centred `#root`)
  and replaced the hard-coded `bg-gray-800`, which made dark text unreadable in light mode.
- `src/types/job.ts`: optional fields are `string | null` (what the API returns), plus
  `STATUS_LABELS: Record<Status, string>` (a new status without a label is a compile error),
  the `isStatus` type guard and `JobApplicationInput`.
- `src/types/exercise.ts`: the same `Exercise` union as the server.
- `src/auth/sessionStore.ts`: a tiny external store over `localStorage`, read in React with
  `useSyncExternalStore`. Plain modules (the HTTP client) can read the token and sign the user
  out on 401, and React re-renders. No Context provider needed. It also listens to the browser's
  `storage` event, so signing out in one tab signs out every tab.
- `src/api/httpClient.ts`: `apiRequest<T>()` adds the bearer token, turns error bodies into
  `ApiError(message, status)`, turns network failures into a friendly message and signs out on 401.
- `src/api/{authApi,jobsApi,exercisesApi}.ts`: one function per endpoint.
- `src/hooks/useJobs.ts`: `queryOptions()` ties the `["jobs"]` key to its data type, so
  `setQueryData` is typed without generics. `useUpdateJob` is **optimistic**: the card moves
  instantly, rolls back if the server refuses, and refetches when settled.
- `src/hooks/useExercises.ts`: after each AI call the response goes straight into the cache
  (no refetch: the user already waited for the AI once).
- `src/main.tsx`: Sentry (only with `VITE_SENTRY_DSN`) and `Sentry.ErrorBoundary`; queries do not
  retry 4xx errors; `sessionStore.subscribe(() => queryClient.clear())` so the next user never
  sees the previous user's cached data.
- `src/App.tsx`: `session ? <BoardPage/> : <AuthPage/>`. No router: there are two screens.
- `src/pages/auth-page/auth-page.tsx`: one form, two modes (`AuthMode` union + a `COPY` record).
- `src/pages/board-page/board-page.tsx`: the container. Loading, error (with retry) and empty
  states, drag-and-drop moves, and a single `OpenDialog | null` state:
  `{ kind: "createJob" } | { kind: "editJob"; job } | { kind: "practise"; job }`.
  You cannot be "editing" without a job.
- `src/pages/board-page/{create,edit}-job-dialog.tsx`: small containers around `JobForm`. Edit
  also deletes (after `window.confirm`).
- `src/components/board|column|card`: stay **dumb** (props in, callbacks out), as you designed
  them. Card: Practise / Edit buttons with descriptive accessible names, a safe external link
  (`rel="noopener noreferrer"`), native `draggable`. Column: drop zone (accepts only our custom
  drag type from `board/jobDrag.ts`), count badge, empty state. Board: `statuses` became
  `readonly Status[]`.
- `src/components/button/button.tsx`: `variant: "primary" | "secondary" | "danger"`, `size`, and
  `type="button"` by default so it never submits a form by accident.
- `src/components/dialog/dialog.tsx`: native `<dialog>` + `showModal()`: focus trap, Escape and
  backdrop for free. Open while mounted. The close button comes last in the DOM so the first
  form field gets focus.
- `src/components/job-form/job-form.tsx`: uncontrolled, read with `FormData` on submit. Native
  constraints (`required`, `maxLength`, `pattern="https?://.+"`) mirror the server rules.
- `src/components/practice-panel/practice-panel.tsx`: container; each exercise gets its own
  `useSubmitAnswer` so one pending grade does not disable the others. Tells the user what the AI sees.
- `src/components/exercise-card/exercise-card.tsx`: dumb; an exhaustive `switch` on
  `exercise.status` with a `never` check, so a new status will not compile until the UI handles it.

Accessibility: drag-and-drop is a pointer shortcut; keyboard and touch users change status in
the Edit dialog. Every input has a label, errors use `role="alert"`, results use `role="status"`,
dialogs are native modals, focus is always visible.

---

## 8. Testing strategy

| Layer | Tool | Count | What it proves | Command |
|---|---|---|---|---|
| Domain + adapters (unit) | Vitest | 53 | ownership rules, auth rules, every AI failure mode, answer saved before grading, request validation, rate-limit windows, LLM reply parsing | `cd server && npm test` |
| HTTP integration | Vitest + Supertest + PostgreSQL | 30 | auth flow, per-user isolation, error mapping (400/401/404/409/413/429), both rate limits, cascade deletes, AI fallbacks through the real stack | `cd server && npm run test:integration` |
| Web | Vitest + RTL + jsdom | 29 | dumb components render and call the right callbacks (drag-and-drop included); the HTTP client signs out on 401; optimistic moves roll back on failure; sign-out syncs across tabs | `npm test` |
| End-to-end | Playwright | 3 | the real journey in Chromium under the production CSP (any violation fails the test): sign up, add, edit, drag (survives reload), practise without AI, delete, user isolation | `npm run test:e2e` |

- The integration setup refuses to run unless the database name ends in `_test`, so it can never wipe your dev data.
- E2E starts its own API (port 3100, AI switched off) and a production build (port 4173), so it
  never clashes with your dev servers and always proves the degraded path.

---

## 9. CI/CD (`.github/workflows/ci.yml`)

Every job runs **inside a container** (the "Dockerised" part): `node:24` for web, API and deploys,
`postgres:17-alpine` as a service container, and Playwright's official image (browsers
preinstalled, tag matching `@playwright/test`) for E2E.

```
web  (lint, typecheck, unit tests, build) ─┐
api  (lint, typecheck, unit, integration) ─┴─▶ e2e ─▶ deploy-api (migrate prod DB, deploy) ─▶ deploy-web
                                                       (only on push to main)
```

- Migrations run **before** the new API is deployed, so they must stay backwards compatible
  (the old code keeps serving until the deploy finishes).
- Vercel CLI pinned (`vercel@64.5.0`) for reproducible deploys.
- Runs on pull requests cancel each other; runs on `main` queue. Cancelling a run in the middle of
  `prisma migrate deploy` would leave a failed migration that blocks every later deploy until repaired by hand.
- The root `vercel.json` ships with `your-api-project.invalid` (a reserved domain that can never
  resolve, so it cannot send requests to a site someone else owns) and `deploy-web` refuses to run
  until it is replaced.
- `server/vercel.json` sets `maxDuration: 30`: the platform must allow longer than our 15 s AI
  budget, or it would cut the request before the fallback runs.
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_API_PROJECT_ID`, `VERCEL_WEB_PROJECT_ID`,
  `PRODUCTION_DATABASE_URL` (the direct, non-pooled URL; migrations need it).

---

## 10. Step-by-step rebuild

Each phase: **Goal → Steps → Verify → Learn** (the concept to be able to explain afterwards).

### 10.1 Phase 1: tooling baseline
Steps:
1. `nvm install 24 && nvm use 24`; add `.nvmrc` with `24`.
2. Add scripts to the root `package.json`: `typecheck` (`tsc --noEmit`), `test`, `test:watch`, `test:e2e`, and `"engines": { "node": "24.x" }`.
3. Run `npm run typecheck`. It fails: `Board` takes `Status[]` but `STATUSES` is `as const`
   (a `readonly` tuple). Fix the prop type to `readonly Status[]`.
4. Remove `<link href="/src/style.css">` from `index.html`.

Verify: `npm run typecheck && npm run lint && npm run build`

Learn: `vite build` strips types without checking them, which is why the error went unnoticed.
Why is `readonly` the right fix rather than copying the array?

### 10.2 Phase 2: database
Steps:
1. `docker-compose.yml` with `postgres:17-alpine` (user/password/db `jobtrack`), a healthcheck,
   a volume and `docker/postgres/create-test-database.sql` mounted into `/docker-entrypoint-initdb.d`.
2. `mkdir server && cd server && npm init -y`; set `"type": "module"`, engines, scripts
   (`dev`, `start`, `typecheck`, `lint`, `test`, `test:integration`, `postinstall: prisma generate`).
3. `npm i @prisma/client@7 @prisma/adapter-pg@7 dotenv` and `npm i -D prisma@7`.
4. Write `prisma/schema.prisma` (section 4) and `prisma.config.ts`.
5. `.env` from `.env.example`; `docker compose up -d db`; `npx prisma migrate dev --name init`.

Verify: `npx prisma studio` shows `User`, `JobApplication`, `Exercise`.

Learn: what a migration is (a versioned, reviewable SQL file), and why `@@index([userId, updatedAt])`
matches "my jobs, newest first".

### 10.3 Phase 3: domain + unit tests
Steps (write the test first where you can):
1. `domain/errors.ts`.
2. `domain/jobs/jobApplication.ts` + `jobService.ts` + `jobService.test.ts` with an in-memory `JobRepository`.
3. `domain/auth/user.ts` + `authService.ts` + tests with a fake hasher (`hashed:<password>`) and token issuer.
4. `domain/exercises/exercise.ts`, `aiOutput.ts`, `withTimeout.ts` (+ test), `questionBank.ts`.
5. `exerciseService.ts` + tests: AI success; no AI configured; AI throws; AI never answers
   (signal aborted); invalid output (empty, wrong shape, plain text); off-task; grading failure;
   score out of range; exercise vanishes while grading; another user's job or exercise.

Verify: `cd server && npm test` (no database, no network: that is the point).

Learn: dependency inversion. Why can `exerciseService` be tested without Anthropic? What would
break if it imported the Anthropic SDK directly?

### 10.4 Phase 4: adapters + composition root
Steps: `prismaClient.ts`, the three Prisma repositories, `bcryptPasswordHasher.ts`,
`jwtTokens.ts`, `anthropicExerciseAi.ts` (+ `readJsonOutput`/`escapeTags` tests), `config.ts`,
then `compositionRoot.ts`.

Verify: `npm run typecheck && npm test`

Learn: structural typing. A Prisma row is assignable to the domain `JobApplication` with no
mapping code, and if the two `JobStatus` lists drift apart the repository stops compiling.

### 10.5 Phase 5: HTTP layer + integration tests
Steps:
1. `http/schemas.ts` + `schemas.test.ts` (prove PATCH `{ status }` contains only `status`).
2. `requireAuth.ts`, `errorHandler.ts`, `routes/*.ts`, `app.ts`, `index.ts`, `api/index.ts`.
3. `test/integration/globalSetup.ts` (the `_test` guard + `prisma migrate deploy`),
   `testApp.ts`, then `auth`, `jobs`, `exercises` test files.

Verify: `npm run dev`, then `curl localhost:3000/api/health`; then `npm run test:integration`.

Learn: Express 5 forwards errors thrown in `async` handlers to the error handler (Express 4 did
not). Why do we answer 404, not 403, for another user's job?

### 10.6 Phase 6: frontend data layer
Steps: `vite.config.js` proxy, `types/*`, `auth/sessionStore.ts`, `api/httpClient.ts`,
`api/*Api.ts`, `hooks/useJobs.ts`, `hooks/useExercises.ts`, `main.tsx`, `App.tsx`, `vite-env.d.ts`.

Verify: `npm run typecheck && npm run lint` (the strict TanStack ESLint config insists on `queryOptions()`).

Learn: `useSyncExternalStore` (state that lives outside React), and the optimistic update
lifecycle: `onMutate` snapshot → `onError` rollback → `onSettled` refetch.

### 10.7 Phase 7: frontend UI + component tests
Steps: `index.css` (`@layer base`), `Button`, `Dialog`, `jobDrag.ts`, `Card`, `Column`, `Board`,
`JobForm`, `ExerciseCard`, `PracticePanel`, `AuthPage`, `BoardPage` and its two dialogs, then
`src/test/setup.ts` and the five `*.test.tsx` files.

Verify: `npm test`, then run both servers and use the app in the browser, in light and dark mode,
at 1280px and 375px.

Learn: why `OpenDialog` is a union instead of `{ isOpen, mode, job? }`, and how the `never`
check in `ExerciseCard` turns a forgotten case into a compile error.

### 10.8 Phase 8: end-to-end tests
Steps: `npx playwright install chromium`; `playwright.config.ts` (two `webServer`s on ports
3100 and 4173, `ANTHROPIC_API_KEY: ""`); `e2e/job-tracking.spec.ts`.

Verify: `npm run test:e2e`

Learn: why E2E uses roles and accessible names (`getByRole("region", { name: "Applied" })`)
instead of CSS selectors.

### 10.9 Phase 9: observability, CI/CD, docs
Steps: Sentry in `main.tsx` and `compositionRoot.ts`; `.github/workflows/ci.yml`; root and
`server/vercel.json`; `README.md`; then the one-time Vercel/GitHub setup in the README.

Verify: open a pull request and watch the four check jobs pass; merge to `main` and watch the deploys.

Learn: why migrations run before the deploy, and why they must be backwards compatible.

### 10.10 Phase 10: hardening (the review's concerns)
Steps, each a small commit:
1. `exerciseService.submitAnswer`: save the answer as `grading_unavailable` before calling the
   AI; return that save if grading fails. Test: the fake AI reads the repository mid-grading.
2. Rate limiting: `RateLimit` model + migration, `http/rateLimiter.ts` (+ unit tests with fake
   timers and an in-memory `HitCounter`), `infrastructure/prismaHitCounter.ts`, the two limits in
   `app.ts`, `check()` in the login and AI routes, 429 + `Retry-After` in `errorHandler.ts`,
   integration tests for both limits. Set the Anthropic workspace spend limit (no code).
3. Security headers: `headers` in the root `vercel.json`, `preview.headers` in `vite.config.js`
   read from it, and the CSP-violation check in `e2e/job-tracking.spec.ts`. Prove the check works
   by adding `style-src 'none'` and watching E2E fail, then remove it.
4. `sessionStore.ts`: the `storage` event listener (+ `sessionStore.test.ts`).
5. `docker-compose.yml` on host port 5433, with the URLs in `server/.env.example` and `.env.test` to match.

Verify: everything in section 13 on Node 24 with the compose database.

Learn: why the rate limits are keyed by email and user id rather than IP here, and why a CSP
matters more when the token lives in `localStorage`.

---

## 11. Principal review of the branch

Reviewed: every file in the diff, plus probes against the running app and database.

**Fixed during the review**

| Finding | Risk | Fix |
|---|---|---|
| Job deleted while its answer was being graded | 500 + false Sentry alert | `saveAttempt` returns `null` → 404 (unit + integration test) |
| Anthropic adapter had no tests | stop-reason / parsing bugs unnoticed | extracted `readJsonOutput` and `escapeTags`, 6 tests |
| Vercel's default function timeout could be shorter than our 15 s AI budget | platform kills the request before the fallback, answer lost | `maxDuration: 30` + comment on the AI timeouts |
| Users were not told what the AI sees | privacy expectation | one-line disclosure in the practice panel |
| Serverless functions exhaust direct DB connections | outages under load | README: pooled URL for the app, direct URL for migrations |
| Card actions wrapped at common widths; 5th column clipped at 1280px | messy, hidden column | link moved up, `min-w-56` columns |
| Question bank said "a Engineer" | looks broken | phrase as "the <role> role" |
| `vite.config.js` linted as browser code | lint error on `process` | Node globals for that file |
| Empty `PATCH {}` | could bump `updatedAt` | probed: it is a true no-op, no change needed |

**Second review pass (before committing)**

| Finding | Risk | Fix |
|---|---|---|
| Password limit counted characters, bcrypt counts bytes | a 72-character accented password was cut to its first 36 characters, so a different password sharing them also signed in | limit by UTF-8 bytes in `registerSchema`/`loginSchema` + test |
| `vercel.json` placeholder was a real-looking domain (`jobtrack-api.vercel.app`) | a forgotten setup would send sign-in requests, passwords included, to whoever owns that name | reserved `.invalid` placeholder + CI guard in `deploy-web` |
| CI cancelled in-progress runs on `main` too | a quick second push could kill `prisma migrate deploy` halfway | cancel only pull-request runs |
| No tests for the HTTP client or the optimistic rollback | the 401 sign-out and the card snapping back could break silently | `httpClient.test.ts` (5) and `useJobs.test.tsx` (2) |
| 413 (body too large) untested | error mapping regression | integration test |
| AI questions and feedback lost their line breaks | multi-line questions became one paragraph | `whitespace-pre-line` |

Scenarios checked and found correct: a stale or tampered session in `localStorage` (self-heals on
the first 401), a JWT secret rotation (everyone is signed out cleanly), the database being down (500,
reported, retry button in the UI), a job deleted in another tab while editing or practising (404
message), AI text rendered as plain text (React escapes it, no XSS), double submits (buttons are
disabled while pending), a stranger's ids in any URL (404 everywhere), an empty `PATCH {}` (no-op).

**Third pass: resolving the remaining concerns**

Each fix was sized by asking: is this the minimum that removes the risk, and is there a
no-code option?

| Concern | Resolution | Why this and not more |
|---|---|---|
| No rate limiting | sign-in: 10 per email per 15 min; AI: 30 per user per hour; counters in PostgreSQL; 429 + `Retry-After` | reuses the database we already run (no Redis); keyed by what we can trust (email, user id); the global cost cap is Anthropic's spend limit, which needs no code |
| No CSP | CSP + `nosniff` in `vercel.json`, served by `vite preview` too; E2E fails on any violation (proved by breaking the policy on purpose) | two headers; one source of truth; verified in CI instead of "add it later and hope" |
| Answer saved after grading | saved first as `grading_unavailable`, the state that is true until a grade arrives | no new status, no migration, no new UI |
| Sign-out did not sync across tabs | one `storage` event listener in `sessionStore` | 6 lines |
| Sentry flushing on serverless | **no code**: `@sentry/node` sees `process.env.VERCEL` and keeps the function alive to flush (`setupVercelKeepAlive`) | checked in the SDK source instead of adding a dependency |
| Built on Node 26 / PostgreSQL 14 | everything re-run on **Node 24.22** against **PostgreSQL 17.11** from `docker-compose.yml`, plus a clean `npm ci` of both packages | it also ran the compose file for the first time, which exposed a port clash with another local PostgreSQL: the database now uses host port 5433 |
| Not verified live | "First deploy checklist" in the README | cannot be done without the Vercel, Anthropic and Sentry accounts |

**Concerns that remain (accepted, with the reason)**

1. **Not verified live** (see the README checklist): the Vercel deploys, the GitHub workflow,
   a real Anthropic call and Sentry.
2. **JWT in `localStorage`, valid 7 days, no revocation.** Now mitigated by the CSP. Upgrade
   path: short-lived token + httpOnly refresh cookie (possible, since everything is same-origin).
3. **Sign-up is not rate-limited.** The only sensible key is the IP, which we cannot trust behind
   the proxy. Mass sign-ups cannot multiply AI spend past the Anthropic spend limit.
4. **While an answer is being graded, another tab shows it as "grading unavailable"** for up to
   15 seconds. Accepted to avoid adding a status.
5. **The frontend trusts response shapes** (TypeScript casts, no runtime validation). Fine while
   we own both ends and E2E covers the contract.
6. **Local E2E leaves `e2e-...@example.com` users in the dev database**, and the old exercise hooks
   (`toggle.ts`, `useDebounce.ts`, `useLocalStorage.ts`) are unused. Harmless; the hooks are your
   earlier learning exercises, so deleting them is your call.

---

## 12. Deliberately left out (and when to add it)

| Not built | Why not now | Add it when |
|---|---|---|
| IP-based rate limits (e.g. on sign-up) | the client IP behind Vercel's proxy and rewrite cannot be trusted | the API gets a verified client-IP header, or moves behind a proxy we control |
| Redis for rate limits | PostgreSQL handles our volume with one query per check | rate-limit checks show up as a database bottleneck |
| A separate `grading` status | `grading_unavailable` is accurate until the grade arrives | users need to see "grading in progress" across tabs |
| Refresh tokens / httpOnly cookies | bearer token is the common SPA trade-off | handling sensitive data, or revocation is needed |
| Reordering cards within a column | needs a `position` column and reorder logic | users ask to prioritise manually |
| Router (`react-router`) | two screens chosen by session | a third screen or shareable URLs |
| Shared types package | five statuses duplicated across a network boundary; repository typing and E2E catch drift | more contracts are shared |
| MSW | dumb components need no network; E2E covers integration | containers need isolated tests |
| API Dockerfile | Vercel builds the API; an unused Dockerfile rots | moving the API to a container host |
| Account deletion, password reset | not needed for the MVP | real users |

---

## 13. Reference

**Environment variables**

| Variable | Where | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | API | yes | pooled URL in production; locally `localhost:5433` (docker compose) |
| `JWT_SECRET` | API | yes | 32+ characters (`openssl rand -base64 48`) |
| `PORT` | API | no | default 3000 |
| `ANTHROPIC_API_KEY` | API | no | without it, the question bank and `grading_unavailable` |
| `ANTHROPIC_MODEL` | API | no | default `claude-opus-5-5` |
| `SENTRY_DSN` | API | no | |
| `VITE_SENTRY_DSN` | web | no | public by design |
| `API_PROXY_TARGET` | web dev/preview | no | default `http://localhost:3000`; E2E sets 3100 |

**Everyday commands**

```bash
docker compose up -d db
```

```bash
cd server && npm run dev
```

```bash
npm run dev
```

```bash
npm run lint && npm run typecheck && npm test
```

```bash
cd server && npm run lint && npm run typecheck && npm test && npm run test:integration
```

```bash
npm run test:e2e
```
