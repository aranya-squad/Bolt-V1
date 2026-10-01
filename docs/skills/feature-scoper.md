# /feature-scoper — Bolt feature intake skill

Invocation: `/feature-scoper <raw idea/context>`

Prospective only after ADR 0005. Existing/in-flight features stay on their current
flow unless the owner explicitly opts them in.

1. Treat the message as raw intake, not final scope.
2. Run G0: inspect refs, bootstrap/brief/router, relevant feature docs and actual
   source/contracts/tests. Reuse existing ownership; do not duplicate features.
3. Determine applicability/grandfathering.
4. PM drafts NEEDS/WANTS/DEFERRED/NON-GOALS and observable acceptance IDs.
5. Risk-route specialists. PM + CTO + Head QA are always mandatory.
6. Required reviewers independently inspect the same source-backed draft. Resolve
   findings; coordinator cannot self-sign mandatory roles.
7. If human direction is genuinely required, pause with the exact question,
   options/tradeoffs and unaffected work. Never invent/override owner intent.
8. Freeze `<feature>.scope.md`, compute SHA-256, record approvals against it in
   `<feature>.plan.json`, run G1.
9. After G1, create Wave → Category → User Story → Task plan with dependencies,
   ownership/model class, checks and AC traceability; run G2.
10. Dispatch bounded workers (normally <=2 writers), integrate, execute relevant
    checks, independent code review and Head QA. Material scope change returns G1.
11. Run G5 only from real recorded evidence, push authorized feature branch and
    update handoff/log/global state only when appropriate.
12. Stop at READY FOR HUMAN REVIEW. Never merge main or deploy from this skill.

During the flow prefer repo/source evidence to memory, never silently turn WANTS
into NEEDS/tasks, do not request human confirmation merely because many files are
involved, and distinguish planned/local-test/CI/merged/deployed/production evidence.

Visible checkpoints: G0 existing behavior+risk route; G1 scope digest+decisions;
G2 waves/tasks/dependencies; G4 integrated SHA+tests/review/fixes; G5 final
branch/SHA+acceptance+human review instructions.

Native ChatGPT slash-command autocomplete and the Project Instructions UI cannot
be registered/edited from GitHub. Add the compact routing text from
`docs/PROJECT_INSTRUCTIONS_AI_SDLC_ADDENDUM.md`; saying "run feature-scoper" also
invokes this repo-backed workflow.
