---
name: bolt-stakeholder-refresh
description: Refresh the existing Bolt V1 stakeholder Google Sheet from live GitHub branches, PRs, commits and CI; create one date-named snapshot tab only when absent. Preserve history and distinguish tested, pushed, merged and released.
---

# Bolt V1 stakeholder tracker refresh

Target repository: `aranya-squad/Bolt-V1`.
Target native Google Sheet (existing, never recreate by default):
`https://docs.google.com/spreadsheets/d/1wVcLg-KVMV9PQ_IUgajTzMFl2jQfiX4e_3AbVeZqwbs/edit`.

## When to run
Use when the owner says "refresh Bolt tracker", "GitHub stakeholder snapshot", or explicitly invokes this skill. This is a read-only GitHub audit plus an authorized Google Sheets update; never commit, merge, deploy, alter GitHub settings, run production tests or change sheet sharing.

## Ground first
1. Read this skill and connected Google Drive/Sheets editing guidance; check account connection. Confirm the target spreadsheet ID and visible tabs by metadata.
2. Resolve current date in the user's timezone (Asia/Kolkata), using YYYY-MM-DD for the tab. Verify exact GitHub repository, default branch SHA, active branch heads, all PR states/merged_at and relevant GitHub Actions runs at exact commits. Use the connected GitHub app, not remembered SHAs or cached descriptions. Include historical completed work only if material to stakeholders.
3. Distinguish `IMPLEMENTED ON BRANCH`, `LOCALLY TESTED`, `CI VERIFIED`, `READY FOR HUMAN REVIEW`, `PR OPEN`, `MERGED`, `RELEASED`, `BLOCKED`, `PROPOSED`, `UNKNOWN`. A source commit, PR title, green mock tests or successful CI does NOT prove merge or deployment. Only mark MERGED from GitHub PR merged state or verified ancestry; only mark RELEASED from independent live deployment evidence. Never infer release from repo docs.
4. Classify rows as `Feature`, `Task`, `Bug`, `Enhancement`. Keep stakeholder text high-level. Use exactly six columns: Category | Item | GitHub status | Summary / evidence | Next action | GitHub link. Each substantive status must have a corresponding durable link or be explicitly UNKNOWN.
5. Preserve historical tabs and manual annotations. If today's tab exists, update that tab in place; never make duplicate date tabs. If absent, copy the latest dated tab as a layout starting point, rename the copy to today's date, then update with fresh evidence. Do not overwrite historical tabs or erase stakeholder edits without an explicit request. Maintain unique row identity by Category + Item; append genuinely new work, retain deferred items. Ask before deleting any item.
6. Keep it simple: one header row, frozen headers, filter, readable wrap, no invented metrics, no dashboards or speculative completion percentages. If same-day, note it was refreshed, not newly created.
7. Verify by rereading metadata, tab title, row count and a sample of status/link cells. Report exact branch/PR/CI evidence limits, link the native Google Sheet, and list major changes since prior snapshot. A user's later approval of enhancements is not proof the GitHub work has been pushed.

## Safety and reproducibility
- Recheck refs immediately before writing. Where a branch or PR moved mid-audit, refetch its relevant evidence and avoid stale statuses.
- Never equate `READY FOR HUMAN REVIEW` with `MERGED`, or `MERGED` with `RELEASED`.
- No app installation is implied by this repository file. A personal ChatGPT skill requires user-side installation/activation when the interface supports it.
- If the spreadsheet or GitHub connector is unavailable, do not invent data or links; state the blocker and provide a proposed snapshot without mutating a different file.
