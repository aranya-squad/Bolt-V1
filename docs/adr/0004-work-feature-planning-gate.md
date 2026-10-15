# Three-role feature planning gate in the owner's Bolt Work environment

Status: ACCEPTED
Recorded: 2026-10-01

## Context

The owner requests reduced coding/rework by having Product Manager, Senior Tech
Manager/CTO and Head QA agents finalize needs/wants before any new feature coding.
They limit the rule to this environment, Project and requesting account.

## Decision

In the owner's ChatGPT Work/cloud sessions for **Cloud dev - Bolt v1**, require
three distinct role agents to approve one versioned, categorized scope with the
same SHA-256 before new feature implementation. Record identities, decisions,
findings/resolutions and the start checkpoint in the owning feature handoff.
Material behavior/contract/acceptance revisions require renewed signoff.
The exact applicability and process live in AGENTS and agent-workflow.

User direction plus signoffs authorizes routine scoped work. Genuine unresolved
product decisions, material expansion and human integration/live boundaries remain.
No external account ID or enforcement system was inspected; applicability comes
from session context, not a claim of account-level technical access control.

## Why

An explicit product outcome, source-backed technical contract and testable QA
criteria reduce ambiguity before parallel writers create conflicting assumptions.

## Alternatives

One coordinator self-approving three roles provides no independent review.
Generic human confirmation on every feature/file increases interruptions.
Universal enforcement across all accounts/tools exceeds the owner's instruction.

## Consequences

Plans record needs versus deferred wants and concrete acceptance criteria. Coding
is blocked if a required role/signoff is missing. Scope approval does not certify
tests, hosted CI, production state, merge or release. Existing completed work is
not retroactively reopened.

## Evidence / human approval

HUMAN: owner message 2026-10-01 requests the three named agent signoffs before
any new feature development, only in this environment/Project/account, and directs
development of 2–3 features together after planning. No merge/deploy authorized.

## Supersession

Adds a narrowly scoped pre-development requirement to ADR 0003; its integration
and production boundaries remain unchanged.
