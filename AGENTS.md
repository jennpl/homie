# Repository instructions

## Product documentation

`docs/PRD.md` is the source of truth for product behavior. Whenever it changes:

1. Review `docs/ENGINEERING_SPEC.md` and update the hand-written technical
   design if the product change affects architecture, data, APIs, security,
   operations, or delivery scope.
2. Run `npm.cmd run docs:sync` to refresh the generated PRD snapshot and revision.
3. Run `npm.cmd run docs:check` before considering the work complete.

Do not edit content between the generated markers in the engineering spec.
