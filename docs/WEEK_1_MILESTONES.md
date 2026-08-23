# Week 1: Independent Barebones MVP

Timebox: 4-5 hours combined  
Week of: 2026-08-23  
Goal: Prove that a raw family text can become an organized daily summary and
plan while the Twilio and organizer workstreams remain independently testable.

## Definition of done

- One shared Neon development database has the committed schema and isolated
  `tony-test`, `partner-test`, and `shared-demo` households.
- A shared core function can save an immutable `Note` and produce
  `NoteCreatedV1`.
- A fixture adapter can create test notes without Twilio.
- The Twilio adapter can hand a normalized note to the same core function.
- Every newly created note triggers one day-window organization attempt; a
  duplicate note triggers none.
- The generic `organize` function can load a household/window, call OpenAI, save
  a grounded organization snapshot, and render digest text.
- A manual command can call `organize` separately for retry or rebuilding.
- Both workstreams have focused tests that require neither the other person's
  code nor the other service's credentials.
- The two paths are demonstrated together once at the end of the week.

Scheduled delivery is a stretch goal. A manually triggered digest proves the
loop within this timebox.

## Contract freeze

Do this together first and avoid changing it independently during the week.

```ts
export type Note = {
  id: string;
  householdId: string;
  authorId: string;
  text: string;
  receivedAt: string;
  localDate: string;
};

export type NoteCreatedV1 = {
  type: "note.created";
  version: 1;
  noteId: string;
};
```

The core ingestion function owns IDs, date assignment, persistence, idempotency,
and event emission. Adapters supply source data; the organizer always reloads
notes from PostgreSQL. `appendNote` never calls OpenAI directly.

```ts
export type OrganizationWindow = {
  kind: "day" | "week" | "month";
  startDate: string;
  endDateExclusive: string;
};

export type OrganizeInput = {
  householdId: string;
  window: OrganizationWindow;
  reason: "note.created" | "manual" | "scheduled" | "retry";
};
```

The Week 1 implementation supports `kind: "day"`; the generic contract avoids
coupling the organizer to daily processing.

## Timeboxed milestones

| Time | Owner | Milestone | Evidence |
| --- | --- | --- | --- |
| 30 min | Together | Scaffold TypeScript backend, one Neon database, migration, three isolated seed households, shared contracts, and `.env.example`. | Both developers run the same schema while selecting different test household IDs. |
| 75 min | Twilio owner | Implement the inbound adapter against a fake `appendNote`; add one success and one duplicate-delivery test. | A captured or representative SMS payload produces one normalized call. |
| 90 min | Organizer owner | Build fixture loader, generic `organize`, real OpenAI structured output, source validation, snapshot persistence, and digest renderer. | `npm` command turns a fixture day into a saved organization snapshot and digest text. |
| 45 min | Together | Replace both fakes with the real core repository/event handoff and run one integration test. | A new stored note triggers one snapshot; a duplicate triggers none. |
| 30-60 min | Together | Fix integration gaps, document commands, and attempt live Vercel/Twilio smoke test. | Repeatable README steps; live SMS if credentials and deployment are ready. |

Total: 4 hours 30 minutes to 5 hours.

## Workstream boundaries

### Twilio workstream

Owns:

- `src/adapters/twilio/`
- The inbound Vercel route
- Mapping a provider message into the core ingestion call
- Adapter-level tests and fixtures

Does not own:

- PostgreSQL schema beyond using the shared repository interface
- AI prompts, planner output, organization snapshots, or digest composition

### Organizer workstream

Owns:

- `src/organizer/`
- Test-note fixtures and fixture runner
- Structured summarizer/planner output
- Generic organization windows and day-window helper
- Source-note validation, snapshot persistence, and digest rendering

Does not own:

- Twilio payloads, phone-number routing, webhook responses, or provider retries

### Shared core

Keep this small and change it together:

- `src/contracts/`
- `src/core/notes/append-note.ts`
- `src/repositories/notes.ts`
- Initial migration and seed data

Both developers copy `.env.example` to `.env.local`, share the development
`DATABASE_URL` securely, and choose their own seeded `HOMIE_HOUSEHOLD_ID`.
Database changes are made only through committed migrations so each checkout
stays compatible.

## Suggested fixture day

```json
[
  {
    "id": "note_1",
    "authorName": "Tony",
    "text": "Soccer moved to six tonight",
    "receivedAt": "2026-08-23T13:15:00Z"
  },
  {
    "id": "note_2",
    "authorName": "Wife",
    "text": "We need milk and birthday candles",
    "receivedAt": "2026-08-23T15:30:00Z"
  },
  {
    "id": "note_3",
    "authorName": "Tony",
    "text": "Actually soccer is at seven",
    "receivedAt": "2026-08-23T16:10:00Z"
  }
]
```

The expected result contains a 7 PM soccer plan, one shopping item grounded in
`note_2`, and no ungrounded facts.

## Stop conditions

To protect the timebox, stop and defer when work requires:

- A frontend or household-management UI
- MMS, photos, email, search, or MCP access
- Multiple households or self-serve onboarding
- A production queue, dead-letter tooling, or delivery-status dashboard
- Prompt optimization beyond producing valid grounded output for the fixture

## End-of-week demo

1. Run the fixture path through the real OpenAI API and show the saved day-window
   organization snapshot and digest.
2. Run the Twilio adapter test and show the identical core note call.
3. Run the integration test from a stored note through the organizer, then show
   that duplicate ingestion does not create another snapshot.
4. If deployed, send one live SMS and manually trigger its digest.
