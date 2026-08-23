# Homie Product Requirements Document

Status: Draft  
Owner: Product  
Last updated: 2026-08-22

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

## MVP experience

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

## MVP boundaries

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
