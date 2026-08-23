# Homie Engineering Specification

Status: Draft  
Owners: Engineering  
PRD revision: <!-- prd-sha256: ee772b8759c8c7c6d36497b1960901301cd86a946e48b5f03ff98f795d6d2f22 -->

## Scope

This specification covers both the one-week barebones proof and the broader MVP
described by the PRD. The first implementation is backend-only and text-only.
The architecture favors a small deployable surface, reliable asynchronous
processing, strict household isolation, and replaceable communications and AI
adapters.

## Barebones MVP slice

The first slice runs as a TypeScript backend on Vercel, stores notes and daily
state in managed PostgreSQL, accepts inbound text through a Twilio adapter, and
uses the OpenAI Responses API to produce structured summaries and plans. There
is no frontend, MMS, email, or self-serve onboarding in this slice.

The Twilio and organizer implementations share only two versioned contracts.
Provider-specific request details must not leak across this boundary.

```ts
export type Note = {
  id: string;
  householdId: string;
  authorId: string;
  text: string;
  receivedAt: string; // UTC ISO-8601 timestamp
  localDate: string;  // YYYY-MM-DD in the household timezone
};

export type NoteCreatedV1 = {
  type: "note.created";
  version: 1;
  noteId: string;
};
```

The SMS workstream converts a valid provider message into a committed `Note`,
then emits `NoteCreatedV1`. The organizer workstream receives the event, loads
the note and its household/day peers from PostgreSQL, and updates the daily
state. Test fixtures create the same `Note` shape and bypass Twilio entirely.

The event carries no message body, phone number, household routing data, or
provider payload. PostgreSQL is the system of record. Emission must occur only
after the note is committed; a production implementation should use an outbox
or equivalent durable mechanism.

### Barebones organization input

```ts
export type OrganizeDayInput = {
  householdId: string;
  localDate: string;
  timezone: string;
  notes: Array<{
    id: string;
    authorName: string;
    text: string;
    receivedAt: string;
  }>;
};
```

`organizeDay` is provider-neutral and can be exercised from a fixture-backed CLI
or test. It returns a schema-validated summary, plan items, and the source note
IDs used for each result.

## Proposed architecture

- **Web/API:** TypeScript Vercel Functions providing provider webhooks and
  backend-only internal endpoints in the barebones slice; authenticated organizer
  APIs and UI follow later.
- **Primary data store:** PostgreSQL with household-scoped foreign keys and
  row-level authorization enforced in the data-access layer.
- **Media:** deferred from the barebones slice; the target MVP uses private object
  storage with malware scanning, metadata stripping, encryption, and short-lived
  signed URLs.
- **Queue and scheduler:** durable jobs for extraction, media processing,
  follow-ups, digest generation, delivery, retries, export, and deletion.
- **SMS/MMS:** Twilio Programmable Messaging for inbound webhooks, outbound SMS
  and MMS, messaging services, and delivery status callbacks.
- **Email:** Twilio SendGrid v3 Mail Send API for digest and transactional email,
  with Event Webhook processing for delivery and suppression state.
- **AI organization:** OpenAI Responses API using a GPT model with text/image
  inputs and Structured Outputs. The integration returns schema-constrained
  proposed items and digest sections, followed by deterministic validation of
  dates, membership, source references, and allowed item types.

The implementation begins as one modular backend with clear adapter, core note,
and organizer modules. Splitting deployable services early would add operational
cost without improving household isolation or delivery reliability.

## Main flow

1. The Twilio adapter receives an inbound SMS, resolves its household and author,
   and calls the core note-ingestion function.
2. Core ingestion stores one immutable `Note` and emits `NoteCreatedV1` after the
   transaction commits.
3. The organizer loads all notes for that household/local date and submits them
   to the OpenAI Responses API using Structured Outputs.
4. Deterministic validation requires valid source note IDs and dates before a
   versioned daily summary and plan are saved.
5. A digest renderer reads the daily state and produces plain SMS text. It can be
   invoked manually in the first slice; a scheduler and outbound delivery follow.

## Data model

| Entity | Important fields |
| --- | --- |
| User | id, auth_subject, display_name, created_at |
| Household | id, name, timezone, digest_local_time, status |
| Membership | household_id, user_id, role, status |
| PhoneIdentity | id, normalized_number, verified_at |
| EmailIdentity | id, normalized_email, verified_at |
| ConsentEvent | household_id, membership_id, channel, destination_id, action, source, occurred_at |
| Note | id, household_id, author_id, text, received_at, local_date, source_provider, source_external_id |
| DailyState | household_id, local_date, version, summary_json, plan_json, updated_at |
| OutboxEvent | id, event_type, schema_version, aggregate_id, payload, created_at, published_at |
| Media | id, note_id, object_key, media_type, scan_status, byte_size |
| Item | id, household_id, source_message_id, type, status, title, due_at, confidence |
| Digest | id, household_id, local_date, content, generated_at |
| DeliveryPreference | membership_id, sms_enabled, email_enabled |
| Delivery | id, channel, digest_id/message_id, recipient_id, provider_id, status, attempts |

The barebones migration needs only Household, Membership/PhoneIdentity, Note,
DailyState, and an event handoff. `(source_provider, source_external_id)` is
unique. All household-owned tables include `household_id`; provider payloads are
adapter concerns and are not inputs to the organizer.

## Interfaces

### Twilio Programmable Messaging

`POST /webhooks/twilio/messaging/inbound`

- The adapter owns Twilio validation, parsing, sender routing, compliance, and
  provider retries.
- Its shared obligation is to call core ingestion with one normalized note,
  using the Twilio Message SID as the source external ID.
- It returns only after the note is durably committed; AI processing is outside
  the webhook contract.

Outbound status handling is deferred until automated digest delivery is added.

### Twilio SendGrid

- Send email through `POST /v3/mail/send` using a restricted API key, verified
  sender/domain, stable template IDs, and opaque custom arguments.
- Keep email rendering separate from SMS composition; include text and HTML
  bodies, unsubscribe controls, and no private content in subject lines.
- Consume signed SendGrid Event Webhooks at
  `POST /webhooks/twilio/sendgrid/events` to update delivery, bounce, spam-report,
  and unsubscribe state idempotently.

### OpenAI daily-note organization

- Call `POST /v1/responses` from a worker, never from the inbound webhook path.
- Provide only normalized notes for one household/local date; do not send phone
  numbers, email addresses, provider identifiers, or raw webhook data.
- For the barebones slice, require Structured Outputs matching a versioned schema
  for `summary`, `plan_item`, and `source_note_ids`. Richer event, task, reminder,
  note, moment, and digest schemas follow after the loop is proven.
- Require source message IDs for every proposed item, reject unknown sources,
  and validate all dates and time zones deterministically.
- Store prompt/schema versions, model ID, latency, token usage, and outcome, but
  never log prompt or response content.
- A failed or invalid model response leaves source notes intact and retryable; it
  must never block ingestion or fabricate a successful digest.

### Organizer API

- `POST /api/households`
- `POST /api/households/:id/invitations`
- `GET /api/households/:id/timeline`
- `PATCH /api/households/:id/items/:itemId`
- `DELETE /api/households/:id/items/:itemId`
- `PATCH /api/households/:id/digest-settings`
- `POST /api/households/:id/export`
- `DELETE /api/households/:id`

Use an authenticated session, CSRF protection for mutations, authorization on
every request, cursor pagination, and an idempotency key on retriable creates.

## Digest behavior

The scheduler scans time-zone buckets and enqueues a unique job keyed by
`household_id + local_date`. Generation reads a consistent snapshot, asks OpenAI
for schema-constrained organization and digest sections, then deterministically
renders channel-specific output. SMS applies a strict segment budget; email can
include a richer summary and sanitized thumbnail links. A digest is skipped when
there is no actionable or new content. Recipient consent, membership, email
suppression state, and per-channel preferences are checked immediately before
each delivery.

## Privacy, safety, and compliance

- Treat message bodies and media as highly sensitive family content.
- Encrypt sensitive fields and separate encryption keys from application data.
- Never place message content in logs, traces, analytics, or model-training data.
- Configure OpenAI data controls and retention appropriate for private family
  content, and document the selected account-level settings before alpha.
- Rate-limit unknown senders and do not reveal household membership.
- Validate MIME type from bytes, cap downloads, block redirects to private
  networks, scan files, and re-encode accepted images.
- Record consent changes append-only and make STOP synchronous and fail-closed.
- Deletion jobs revoke access immediately, then remove database and object-store
  data with a verifiable completion record.
- Complete messaging-provider registration and legal/privacy review before beta.

## Reliability and observability

- Transactional outbox for jobs created with database changes.
- Exponential retry with jitter and dead-letter review for all external calls.
- Metrics: webhook latency/error rate, queue age, extraction outcome, digest
  lateness, delivery success, opt-out processing, and deletion completion.
- Alerts must use opaque IDs and counters, never family content.
- Reconciliation job compares provider delivery states with local deliveries.

## Testing strategy

- Unit tests for parsing, time zones, command precedence, authorization, digest
  selection, and extraction validation.
- Shared contract tests proving both a fixture adapter and the Twilio adapter can
  create the same `Note` shape and emit `NoteCreatedV1`.
- Organizer tests run from fixtures without Twilio credentials; Twilio adapter
  tests run with a fake core ingestion function without OpenAI credentials.
- Contract tests for the versioned OpenAI Structured Outputs schema.
- Integration tests for idempotent inbound messages and outbound retries.
- Security tests for cross-household access, malicious media, SSRF, and signed URL
  expiry.
- End-to-end tests for consent, capture, correction, digest, export, and deletion.
- A redacted evaluation set measures extraction acceptance and correction rates.

## Delivery sequence

1. Repository foundations, auth, households, membership, and consent ledger.
2. Inbound text pipeline, timeline, and organizer correction flow.
3. OpenAI daily-note organization with Structured Outputs, evaluation harness,
   source grounding, and confidence handling.
4. Media ingestion and sanitized private viewing.
5. Digest scheduler, Twilio SMS and SendGrid email delivery, channel preferences,
   callbacks, and suppression controls.
6. Export/deletion, reconciliation, dashboards, security review, and alpha launch.

## Decisions still required

- Dedicated-versus-pooled Twilio number strategy and Messaging Service topology.
- Hosting platform, queue implementation, and object storage provider.
- Identity provider and policy for members without web accounts.
- Retention defaults, age/minor policy, supported image limits, OpenAI model,
  prompt versioning policy, and acceptable per-digest inference cost.
- Exact alpha service objectives and per-household cost ceiling.

## Vendor references

- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Twilio Messaging webhooks](https://www.twilio.com/docs/usage/webhooks/messaging-webhooks)
- [Twilio outbound SMS/MMS](https://www.twilio.com/docs/messaging/tutorials/how-to-send-sms-messages)
- [Twilio SendGrid Mail Send API](https://www.twilio.com/docs/sendgrid/api-reference/mail-send)

## Synchronized PRD snapshot

The section below is generated by `npm run docs:sync`. Do not edit it directly.

<!-- BEGIN GENERATED PRD -->

# Homie Product Requirements Document

Status: Draft  
Owner: Product  
Last updated: 2026-08-23

## Summary

Homie gives a household one phone number to which approved family members can
send texts and photos. Homie organizes those contributions into a private
family timeline. AI-assisted organization turns the day's unstructured notes
into proposed plans, tasks, reminders, and moments, then Homie sends an optional
daily digest by text, email, or both.

## Problem

Family coordination is scattered across group chats, calendars, notes, and
camera rolls. Useful details get buried, not everyone installs the same app,
and one person often becomes the household's unofficial administrator.

## Product principles

- Capture must be easier than opening another app: send a normal SMS or MMS.
- The family stays in control of membership, delivery times, and retained data.
- Digests should reduce noise, not create another stream of notifications.
- Automation may suggest structure, but people can correct or dismiss it.
- Private family content is never used for advertising.

## Users

- **Household organizer:** creates the household, invites members, configures
  the digest, and corrects extracted plans or tasks.
- **Family member:** texts updates or photos and receives the digest if opted in.
- **Occasional contributor:** participates through SMS/MMS without installing an
  app.

## Core jobs

1. Capture a plan, reminder, request, or photo in seconds.
2. Know what the household needs to do today and soon.
3. Keep useful family moments together without searching old group chats.
4. Include relatives who will not install or learn a new application.

## Barebones MVP

The first usable slice is a backend-only, text-only family notebook for one
preconfigured household. Its purpose is to prove the loop from capture to an
organized daily plan while allowing the SMS integration and AI organizer to be
built independently.

### User experience

1. An approved family member sends a plain-text SMS to the Homie number.
2. Homie stores the message as an immutable note assigned to the household's
   local date.
3. The organizer reads that day's notes and saves an updated summary and plan.
4. A digest can be generated on demand and, once scheduling is connected, sent
   once per day by SMS.

The organizer must also accept test notes with the same stored-note shape so it
can be developed without Twilio credentials or a live phone number.

### Shared product contract

- Every accepted SMS produces exactly one stored note.
- Each note contains an ID, household ID, author ID, text, received time, and
  household-local date.
- A saved note produces a versioned `note.created` event containing only its
  note ID.
- The organizer loads source notes from the backend; events and model prompts do
  not become the system of record.
- Every generated summary or plan remains traceable to its source note IDs.

### Barebones success criteria

- A fixture note and a Twilio-originated note can travel through the same core
  ingestion contract.
- Duplicate provider delivery does not create a duplicate note.
- Adding a note can update the correct household/day summary and plan.
- A human-readable digest can be generated from the stored daily state.
- Each workstream can run its tests without the other workstream's external
  service credentials.

### Deferred from the barebones MVP

- Photos and MMS processing, email, web UI, self-serve household setup, multiple
  households, correction workflows, search, exports, and production-grade queue
  recovery.
- Automatic daily scheduling is the first follow-on if it does not fit the
  initial one-week timebox; manual digest generation is sufficient to prove the
  product loop.

## Target MVP experience

### Household setup

The organizer signs in to a lightweight web app, creates a household, chooses
its time zone and digest time, and verifies their mobile number. Homie assigns
the household a phone number and lets the organizer invite members. Every
member must explicitly opt in before messages or digests are sent to them.

### Capture by text

Approved members can send plain text and supported image attachments. Homie
acknowledges receipt and classifies a message as a note, event, task, reminder,
or moment. When the classification is uncertain or a date is ambiguous, Homie
asks a short follow-up instead of silently inventing details.

Examples:

- "Dentist Tuesday at 3" becomes a proposed event.
- "Someone grab milk" becomes an open task.
- A photo with "First day of school" becomes a family moment.
- "Remind Dad to call the plumber tomorrow" becomes a reminder.

### Review and correction

The web app shows a chronological inbox and structured items derived from it.
AI processes the household's daily notes and photo captions to group related
updates, extract actionable items, and draft a concise digest. An organizer can
edit, confirm, complete, dismiss, or delete items. The original message remains
linked to each derived item for traceability, and AI-generated suggestions are
always presented as editable rather than authoritative.

### Daily digest

At the household's configured local time, opted-in members receive a concise
digest by SMS, email, or both according to their preferences. It includes today's
events and reminders, overdue and open tasks, and a small selection of recent
moments. If there is nothing actionable or new, Homie does not send an empty
digest.

### SMS commands

- `HELP`: show supported commands and support information.
- `STOP`: immediately opt the sender out, following carrier requirements.
- `START`: begin the re-consent flow.
- `DIGEST OFF` / `DIGEST ON`: change digest delivery without disabling capture.
- `DELETE ME`: start an identity-confirmed personal-data deletion flow.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-1 | Provision one inbound SMS/MMS number per household or provide equivalent isolated routing. |
| FR-2 | Accept content only from consented household members and safely reject unknown senders. |
| FR-3 | Store the original message, sender, received time, attachments, and provider identifiers idempotently. |
| FR-4 | Use AI assistance to organize daily notes and extract proposed events, tasks, reminders, notes, and moments while preserving every source message. |
| FR-5 | Support organizer review, correction, completion, dismissal, and deletion in a responsive web app. |
| FR-6 | Generate digests in the household time zone and deliver through each opted-in recipient's selected SMS and/or email channels. |
| FR-7 | Honor messaging compliance commands immediately and maintain auditable consent records. |
| FR-8 | Allow household export and deletion, including stored media and derived data. |
| FR-9 | Scan uploads, enforce file type and size limits, and strip unnecessary image metadata. |
| FR-10 | Prevent one household from accessing another household's messages, media, or derived items. |
| FR-11 | Track outbound SMS and email delivery outcomes and stop retrying suppressed or opted-out destinations. |

## Non-functional requirements

- Inbound webhook acknowledgement p95 under 2 seconds; processing may continue
  asynchronously.
- 99.9% monthly availability target after beta.
- Digest dispatch begins within five minutes of the configured time.
- Encryption in transit and at rest, least-privilege access, secret rotation,
  audit logs for sensitive actions, and expiring signed media URLs.
- Idempotent inbound processing and outbound delivery retries with backoff.
- Accessible responsive web UI targeting WCAG 2.2 AA for core workflows.
- Observability must avoid logging message bodies or image contents by default.

## Success metrics

- At least 60% of activated households receive a useful digest in week one.
- At least 40% of activated households are still active after four weeks.
- At least 70% of extracted items are accepted without correction.
- Fewer than 2% of digests are muted or opted out within seven days of first send.
- No cross-household data exposure and 100% successful processing of STOP events.

## Target MVP boundaries

### Included

- US/Canada SMS and MMS, English language, one household per account, responsive
  web administration, daily SMS/email digest, and basic export/deletion.

### Not included

- Native mobile apps, group-chat replacement, video ingestion, shared calendar
  write access, payments, public photo albums, location tracking, and medical or
  emergency alerting.

## Risks and open questions

- Dedicated numbers improve the mental model but may make unit economics hard;
  evaluate pooled numbers with household routing codes before implementation.
- MMS behavior, limits, and pricing vary by carrier and region.
- Automated extraction can create false confidence; define confidence thresholds
  and correction UX through prototype testing.
- Decide default retention period and whether children can be household members.
- Validate the name "Homie" through trademark, domain, and app-store searches.

## Release stages

1. **Prototype:** test capture and digest comprehension with synthetic data.
2. **Private alpha:** 10-20 invited households, manual support, no minors.
3. **Beta:** self-serve onboarding, deletion/export, operational dashboards, and
   messaging compliance review completed.

<!-- END GENERATED PRD -->
