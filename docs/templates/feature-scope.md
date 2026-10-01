# Feature scope template

Use for the mandatory three-role gate where AGENTS says it applies. This template
is not an active feature tracker. Copy into the owning feature branch and record
version plus SHA-256 before implementation starts.

## Identity and outcome

Feature ID/title; requester direction; applicability environment; problem; user
outcome; exact base/dependencies and feature-only/full-main comparison ranges.

## Existing behavior and source evidence

Separate implemented functionality from proposed changes; name files/functions
and authoritative state. Do not rely solely on previous chat/product plans.

## Categorized needs and wants

| Category | Priority | Observable behavior | Acceptance ID |
|---|---|---|---|
| Need | Must implement | Concrete behavior | AC-01 |
| Want | Deferred unless included explicitly | Optional behavior | — |

Explicit non-goals, exclusions and product decisions. Record conservative defaults
that reviewers can approve; escalate material ambiguous rules to the owner.

## Contract and implementation boundaries

Actors/ownership; UX loading/empty/error/freshness; API fields/errors/compatibility;
authoritative data; transactions/concurrency; auth/cache boundaries; affected files
and exclusive worker ownership; migrations/rollout/rollback; operational limits.

## Acceptance and QA plan

AC IDs → observable tests, fixtures and expected outcomes. Include meaningful
failure/authorization/concurrency tests where needed and measurement baselines.
Distinguish required executed checks from planning assertions and live unknowns.

## Decisions, risks and dependencies

Open blockers/owners; excluded/deferred product rules; prerequisite branches and
human integration order. No hypothetical blocker should replace routine judgment.

## Frozen scope and signoff record

Scope version/path/SHA-256; timestamp; PM/CTO/QA agent identifiers and each explicit
APPROVED/BLOCKED decision against the same digest; findings/resolutions. Store
signoffs separately from hashed scope text so signatures do not invalidate it.
Any material scope revision requires renewed three-role approval before coding.

## Implementation and release gates

Record implementation start only after all three approve. Track executed checks,
reviewed code SHA, remaining limitations and exact continuation in the owning
feature tracker. No merge/deploy/live mutation is implied by planning signoff.
