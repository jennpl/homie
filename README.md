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
