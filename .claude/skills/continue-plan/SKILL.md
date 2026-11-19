---
name: continue-plan
description: Resume one AI Productivity Hub implementation slice from a repository plan. Use for /continue-plan or requests to continue, resume, or start the next slice of an existing implementation plan.
argument-hint: '[part of the plan file name]'
---

# Continue a Plan

Implement one reviewable slice, using the repository as the handoff between sessions. Follow [root AGENTS.md](../../../AGENTS.md), applicable nested instructions and the current specification documents; this skill does not grant permission to change approved architecture or commit code.

## Find the Plan

1. Inspect the repository root and documentation directory. The product specification is `Docs/AI_Productivity_Hub_Spec.md`, with architecture, database, REST and MCP/security contracts in sibling documents; preserve actual path casing if the directory changes later.
2. Find `*-Plan.md` files below that directory, matching the suffix case-insensitively. Exclude translations such as `*-Plan.zh-CN.md`; plans are maintained in English.
3. If an explicit plan path was supplied, use that file. Otherwise filter by `$ARGUMENTS` as a case-insensitive filename substring, then retain plans with unfinished slices.
4. If several candidates remain, list each with its next unfinished slice and ask which to use. If none exists, report that no matching unfinished plan exists and stop. Offer planning as the next step; do not create a plan or start the specification backlog implicitly. If the explicit plan is complete, report completion and stop.

## Reorient and Select

1. Read the complete plan, relevant product sections/ADRs and the owning technical documents listed in root `AGENTS.md`, current branch and `git status`. Inspect relevant working-tree differences and slice commits with `git log --oneline --fixed-strings --grep "<slice tag>"`. An unborn repository may have no commits; report that fact without treating it as lost work.
2. Select the first slice not marked `done`. Resume `in progress` work before starting `pending` work. Check its dependencies, acceptance criteria, decisions, carry-over and any preflight findings against actual files.
3. Distinguish uncommitted implementation from missing implementation. Completion and commit status are separate: an uncommitted slice can be verified, and an `in progress` slice need not have a commit yet. If status contradicts code/test evidence, dependencies are incomplete, or overlapping user changes cannot be safely attributed, explain the discrepancy and resolve it with the user before dependent edits. Preserve unrelated changes.
4. State the slice objective, assumptions, expected behavior, affected files and verification plan. Proceed within the user's existing authorization; ask only about unresolved scope, behavior, data or contract decisions. A request to continue authorizes this slice, not subsequent slices or publication.

## Implement and Verify One Slice

1. Set the selected slice to `in progress`. Recheck the actual toolchain and scripts before running commands; missing application projects are not permission to scaffold outside the selected slice.
2. Implement one acceptance criterion at a time using the TDD workflow in `AGENTS.md`. Confirm behavioral Red failures, then minimum Green code and scoped refactoring. Documentation-only or visual changes use appropriate document/build/visual checks instead of invented unit tests.
3. Keep the slice's Decisions current, recording reasons and unresolved questions. Explicitly approved requirement changes belong in the specification and relevant ADR/contract documentation too. Avoid copying the entire specification into the plan.
4. Run the impact-based gates in `AGENTS.md`, including cross-stack, database, security, responsive and MCP checks when affected. Record exact commands, results and unverified scope. Never label simulated or unit-only checks as browser/SQL/MCP end-to-end verification.
5. Review the actual diff against acceptance criteria and applicable instructions. Arrange independent review for substantive security, contract or data-integrity changes when available. Fix actionable findings and rerun affected checks.

## Close or Hand Off

- Set `done` only after every acceptance criterion and applicable quality gate passes. Otherwise retain `in progress` and document blockers, partial results and exact resumption steps.
- Record verification, decisions and carry-over in the plan alongside the implementation changes. Report completion separately from whether a commit exists.
- Give the completion report required by `AGENTS.md`. Commit only when explicitly requested; stage explicit paths and include the slice tag in the subject, e.g. `feat: add task creation (hub slice 3)`. Keep the plan update and slice implementation in the same commit when committing; do not store the commit's own hash in the plan.
- Stop after this slice. If interrupted or context grows long, persist the current state, remaining work, failed checks and next command in the plan so a fresh session can resume without conversation history.

## Plan Contract

Use this structure when the user separately requests an implementation plan. Place `<SpecName>-Plan.md` next to its specification. This is a format reference, not an instruction to create a plan during continuation.

```markdown
# <Title> — Implementation Plan

Spec: [<Title>](<SpecName>.md)
Slice tag: `hub slice`

## How to Continue

Use /continue-plan <filename fragment>. Resume the first unfinished slice only.

## Preflight Findings

Verified repository/toolchain facts, unresolved decisions and their impact.

## Slices

| # | Scope | Status | Depends on |
|---|-------|--------|------------|
| 1 | <Observable outcome> | pending | None |

### Slice 1 — <Title>

- Scope / exclusions:
- Spec refs: document paths with section numbers, plus product AC IDs where applicable.
- Depends on:
- Acceptance criteria: Given ..., when ..., then ...
- Affected files / contracts:
- Verification: commands, expected outcomes, then actual results.
- Decisions: decision and reason; approved spec/ADR changes if any.
- Carry-over: blockers, partial work, unverified scope and next action.
```

Statuses: `pending`, `in progress`, `done`. A dependency must be `done` before dependent implementation starts. Keep this plan as the source of slice status; use Git history for commit evidence.
