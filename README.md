# Homie

Homie gives a family one phone number for capturing messages and photos, then
turns those contributions into a useful daily digest of plans, reminders, and
moments.

## Product and engineering docs

- [`docs/PRD.md`](docs/PRD.md) is the product source of truth.
- [`docs/ENGINEERING_SPEC.md`](docs/ENGINEERING_SPEC.md) contains the technical
  design and an automatically synchronized snapshot of the PRD.

After changing the PRD, run:

```powershell
npm.cmd run docs:sync
```

CI runs `npm run docs:check` and fails when the engineering spec has not been
refreshed from the latest PRD.
