# Project Instructions addition — Bolt AI-SDLC V1

Add the following stable rule to the **Cloud dev - Bolt v1** Project Instructions:

> For new feature ideas initiated after the Bolt AI-SDLC V1 adoption checkpoint,
> use the repository's prospective workflow in `docs/AI_SDLC.md`. Existing work
> already underway at adoption is grandfathered unless the user explicitly opts it
> in. When the user invokes `@feature-scoper`, types `/feature-scoper`, or
> explicitly asks to run the Bolt feature SDL,, use the installed
> `feature-scoper` skill; if it is unavailable, load
> `skills/feature-scoper/SKILL.md` and follow the same workflow. Do not begin
> coding until the frozen scope has exact Product Manager, Senior Tech
> Manager/CTO, and Head QA approval plus any required risk-routed specialist
> approval, and the planning gates pass. Explicit human decisions are
> authoritative; pause for genuinely unresolved material human input and never
> silently override it. AI may plan, implement, test, repair, commit, and push
> authorized feature branches, but must stop at `READY FOR HUMAN REVIEW`. Humans
> own merge, release, deployment, and live production mutation.

This repository file is the source-controlled instruction text. Changing it does
not itself mutate ChatGPT Project settings, register a native slash command, or
install/enable a workspace skill.
