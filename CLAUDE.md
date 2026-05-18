# CLAUDE.md

Behavioral guidelines derived from Andrej Karpathy's observations on LLM coding pitfalls,
extended for a senior engineering manager and indie game studio context.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial one-liners, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- For game systems: call out design implications (performance, feel, player impact) before writing code.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

For game dev specifically:
- Prefer data-driven over hardcoded only when the data will actually change.
- Don't add a full ECS/event bus for a system that has two moving parts.
- Premature optimization is worse here — profile first, optimize second.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Hard Rules:
- NEVER modify files not mentioned in the task.
- NEVER change formatting or style in untouched files.
- ALWAYS confirm scope before editing more than 3 files.

The test: Every changed line should trace directly to the request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."
- "Make the enemy AI better" → "Enemy should path-find around obstacles, re-target on player death, and not clip through walls — verified in Play mode."

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 5. Engineering Manager Standards

**Code is a team asset. Write it like someone else is on call at 2am.**

- Every non-trivial function gets a one-line doc comment explaining *why*, not *what*.
- Public APIs must have clear contracts (inputs, outputs, failure modes).
- Flag tech debt with `// TODO(debt):` — don't silently accumulate it.
- If a decision has architectural implications, surface it before committing.
- PR/diff hygiene: one logical change per commit. Don't bundle unrelated fixes.
- Name things for the reader, not the writer. `playerHealthAfterDamage` > `phad`.

When reviewing or producing code for review:
- Call out coupling that will hurt in 6 months.
- Prefer reversible decisions over clever ones.
- Document the "why we didn't do X" when the obvious approach was rejected.

## 6. Game Studio Context

**Ship is the goal. Taste is the constraint.**

Architecture:
- Separate game logic from rendering from input from data. Don't entangle them.
- Prefer composition over inheritance for game entities.
- Keep game state serializable from day one (save systems are hard to retrofit).

Performance (game-specific):
- Flag allocations in hot paths (Update loops, collision callbacks).
- Object pooling is the default for frequently spawned/destroyed objects.
- Never do heavy computation on the main thread without a comment explaining why it's acceptable.

Workflow:
- Editor/tool scripts and runtime code live in separate folders. Keep them clean.
- Magic numbers get named constants with a comment on where they came from.
- If a value belongs to a designer, it belongs in a config/ScriptableObject/data file — not in code.

---

## Project-Specific Instructions

> Replace or extend this section per project.

```
# Example — fill in for your active project:
# Engine: Unity 6 / Unreal 5 / Godot 4
# Language: C# / C++ / GDScript
# Test runner: [e.g., Unity Test Framework, pytest]
# Key directories:
#   src/       — runtime game code
#   tools/     — editor utilities
#   data/      — ScriptableObjects / config
#   tests/     — unit + integration tests
# Naming conventions: [e.g., PascalCase for classes, _camelCase for private fields]
# Build command: [e.g., `./build.sh` or CI pipeline]
```

---

**These guidelines are working if:**
- Diffs contain only requested changes.
- Clarifying questions appear *before* implementation, not after mistakes.
- Code is simple the first time, not after rewrites.
- No drive-by refactoring in PRs.
- The agent states its plan before multi-step tasks.
