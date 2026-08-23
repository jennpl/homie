# Week 1: Independent Barebones MVP

Timebox: 4-5 hours combined  
Week of: 2026-08-23  
Goal: Prove that a raw family text can become an organized daily summary and
plan while the Twilio and organizer workstreams remain independently testable.

## Definition of done

- One preconfigured household and two test members exist in local PostgreSQL.
- A shared core function can save an immutable `Note` and produce
  `NoteCreatedV1`.
- A fixture adapter can create test notes without Twilio.
- The Twilio adapter can hand a normalized note to the same core function.
- The organizer can load a household/day, save a grounded summary and plan, and
  render digest text.
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

The core ingestion function owns IDs, date assignment, persistence, and event
emission. Adapters supply source data; the organizer always reloads notes from
PostgreSQL.

## Timeboxed milestones

| Time | Owner | Milestone | Evidence |
| --- | --- | --- | --- |
| 30 min | Together | Scaffold TypeScript backend, migration, seed household, shared contracts, and interfaces. | Both test suites compile against the same contracts. |
| 75 min | Twilio owner | Implement the inbound adapter against a fake `appendNote`; add one success and one duplicate-delivery test. | A captured or representative SMS payload produces one normalized call. |
| 90 min | Organizer owner | Build fixture loader, `organizeDay`, structured result validation, and digest renderer. | `npm` command turns a fixture day into saved summary/plan JSON and digest text. |
| 45 min | Together | Replace both fakes with the real core repository/event handoff and run one integration test. | A stored note triggers one daily-state update. |
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
- AI prompts, planner output, daily state, or digest composition

### Organizer workstream

Owns:

- `src/organizer/`
- Test-note fixtures and fixture runner
- Structured summarizer/planner output
- Source-note validation, daily-state persistence, and digest rendering

Does not own:

- Twilio payloads, phone-number routing, webhook responses, or provider retries

### Shared core

Keep this small and change it together:

- `src/contracts/`
- `src/core/notes/append-note.ts`
- `src/repositories/notes.ts`
- Initial migration and seed data

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

1. Run the fixture path and show the saved daily state and digest.
2. Run the Twilio adapter test and show the identical core note call.
3. Run the integration test from a stored note through the organizer.
4. If deployed, send one live SMS and manually trigger its digest.
