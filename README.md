# Homie

Homie gives a family one phone number for capturing messages and photos, then
turns those contributions into a useful daily digest of plans, reminders, and
moments.

## Product and engineering docs

- [`docs/PRD.md`](docs/PRD.md) is the product source of truth.
- [`docs/ENGINEERING_SPEC.md`](docs/ENGINEERING_SPEC.md) contains the technical
  design and an automatically synchronized snapshot of the PRD.
- [`docs/WEEK_1_MILESTONES.md`](docs/WEEK_1_MILESTONES.md) timeboxes the first
  independently buildable backend slice to 4-5 combined hours.

After changing the PRD, run:

```powershell
npm.cmd run docs:sync
```

CI runs `npm run docs:check` and fails when the engineering spec has not been
refreshed from the latest PRD.

## Barebones backend

The first runnable slice has no frontend and no Twilio dependency. It provides:

- PostgreSQL migrations and deterministic development households
- Idempotent immutable note storage plus a `note.created` outbox event
- A generic organizer with a day-window helper
- Real OpenAI Responses API Structured Outputs with source-note validation
- Manual CLI and authenticated Vercel endpoints

`appendNote` and `organize` are separate. Creating a new note through the manual
API or CLI invokes them in sequence; duplicate ingestion returns the existing
note and skips organization. If OpenAI fails, the note remains stored and the
organizer can be run again.

### One-time setup

Use Node.js 22 or newer and create one Neon PostgreSQL development database.
Tony and Partner can use the same database because each selects a separate seeded
household.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
# Fill in DATABASE_URL, OPENAI_API_KEY, and HOMIE_INTERNAL_API_KEY.
# Tony uses HOMIE_HOUSEHOLD_ID=tony-test.
# Partner uses HOMIE_HOUSEHOLD_ID=partner-test.
npm.cmd run db:migrate
npm.cmd run db:seed
```

For the shorter developer-specific setup, first clone the repository and run:

```powershell
# Tony
npm.cmd run setup:tony

# Partner
npm.cmd run setup:partner
```

The first run installs dependencies, creates `.env.local`, and selects the
developer's isolated household. If `DATABASE_URL` is still the placeholder, the
script stops and asks for the shared Neon URL. Add it locally and run the same
command again; the script then applies migrations and seed data. Partner does not
need `OPENAI_API_KEY` unless she wants to run the organizer herself.

Share `DATABASE_URL` and other secrets outside Git. Schema changes belong in a
new numbered file under `db/migrations`; both developers pull the same migration
files. Never edit an already-applied migration.

### Manual development loop

Adding a note stores it, creates an outbox event, organizes its complete local
day with OpenAI, and saves a new immutable snapshot:

```powershell
npm.cmd run note:add -- --author tony --text "Soccer moved to seven tonight"
```

Organization remains independently callable for retries and future scheduled
work:

```powershell
npm.cmd run organize -- --date 2026-08-23
```

Run local checks with:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
```

### Vercel endpoints

Configure the same variables from `.env.example` in the Vercel project. The
backend exposes two temporary internal endpoints:

- `POST /api/notes` with `{ "authorId": "tony", "text": "Buy milk" }`
- `POST /api/organize` with `{ "localDate": "2026-08-23" }`

Both require `Authorization: Bearer <HOMIE_INTERNAL_API_KEY>`. These endpoints
are for development only and should be replaced by authenticated product APIs.

### Independent Twilio work

Partner's adapter only needs the shared note contract and database-backed note
service; it does not require OpenAI credentials:

```ts
import { createNoteService } from "./src/app.js";

const { appendNote } = createNoteService();
const result = await appendNote(normalizedTwilioNote);
```

The adapter should trigger downstream processing only when `result.created` is
true. Adapter tests can inject a fake `AppendNote` function and need neither
PostgreSQL nor OpenAI.
