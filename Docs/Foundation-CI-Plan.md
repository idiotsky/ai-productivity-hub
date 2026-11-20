# Foundation CI — Implementation Plan

Spec: [AI Productivity Hub](AI_Productivity_Hub_Spec.md)
Target issue: [#1 — Foundation: Configure independent Client and Server CI](https://github.com/idiotsky/ai-productivity-hub/issues/1)
Slice tag: `foundation ci slice`

## How to Continue

Use `/continue-plan Foundation-CI`. Resume the first unfinished slice only, complete its checks, update this plan, and stop. Planning does not implement any slice or authorize commits, pushes, PR creation, Issue comments, deployment, or branch-protection changes. Obtain explicit authorization for publication before remote verification.

## Preflight Findings

Inspected on 2026-11-19: branch `main`, clean working tree before this plan.

- `client/` contains Angular 22.3 scaffolding, a committed npm lockfile, Prettier configuration, and Angular's unit-test builder with Vitest installed. It has no PrimeNG dependency, ESLint configuration, or format/lint scripts. Existing tests have not been rerun during planning.
- `server/` contains a minimal ASP.NET Core host, solution, and `global.json` requiring SDK 11.0.100 with `latestPatch` roll-forward. No test project or explicit analyzer policy exists. The existing Server README records prior build, format, and HTTP smoke results; those are historical evidence, not checks run for this plan.
- Available commands report Node.js 24.22.0, npm 12.2.0, and .NET SDK 11.0.100. Package-registry access, dependency compatibility, and hosted-runner availability remain unverified.
- No CI workflows or earlier implementation plan exist. The Issue requires local gates, actual successful GitHub runs, controlled failure evidence, and path-filter verification before completion.
- The Issue text was retrieved during this chat. Re-read it before implementation to detect changes.

## Scope and Decisions

- Preserve Angular 22, PrimeNG 22/Aura, .NET 11, and independent Client/Server dependency graphs. Verify compatible exact package and action versions at implementation time; record blockers rather than substitute stack versions.
- First finish the Issue's base-project prerequisites with minimal tooling and meaningful tests. Do not add business features, API/health endpoints, database modules, authentication, or deployment scaffolding.
- Retain the adopted Angular/Vitest runner. Select and record a supported Server test runner during slice 1; the repository has not adopted one. Use tests of the existing host's observable behavior rather than a passing placeholder. Treat zero discovered tests as an invalid gate.
- PrimeNG setup is limited to a minimal Aura-enabled shell; it does not implement the full theme, localization, or navigation backlog. Verify the affected UI at the repository-required viewport sizes and keyboard interaction.
- Product scope and ADRs remain unchanged. No public REST/MCP, persistence, or security contract changes are planned. Read the owning documents and resolve scope before introducing any such change.
- GitHub workflow implementation must be checked against official documentation at execution time. This plan specifies behavior without claiming unverified action versions or runner capabilities.

## Slices

| # | Scope | Status | Depends on |
|---|-------|--------|------------|
| 1 | Base projects pass independent local quality gates | done | None |
| 2 | Independent path-aware Client and Server workflows and local documentation | pending | 1 |
| 3 | Actual GitHub success, path selection, and controlled failure evidence | pending | 2; explicit publication authorization |

### Slice 1 — Complete Local Quality-Gate Prerequisites

- Scope / exclusions: add the minimal PrimeNG 22/Aura setup, Client formatting/lint commands and compatible ESLint configuration, and Server test/analyzer configuration. Fix only scaffold violations required for those gates. No business features or new endpoints.
- Spec refs: [Product §1](AI_Productivity_Hub_Spec.md#1-confirmed-adrs-and-product-scope), [Product §11](AI_Productivity_Hub_Spec.md#11-engineering-backlog-epics), [Architecture §10](ARCHITECTURE.md#10-ui-requirements), and [Architecture §10A.4](ARCHITECTURE.md#10a4-path-aware-cicd-and-change-impact). No business AC is claimed complete.
- Depends on: current Client and Server scaffolds; registry access and compatible packages.
- Acceptance criteria:
  - Given a clean checkout with documented toolchains, when Client dependencies are installed with `npm ci`, then format-check, lint, non-interactive tests with a nonzero test count, and a production build pass independently of Server.
  - Given the initialized shell, when rendered at 375px, 768px, and 1280px, then the minimal PrimeNG/Aura integration renders without overflow and supports applicable keyboard interactions.
  - Given a clean checkout, when Server is restored, built with enabled analyzers, tested, and format-checked, then all gates pass independently of Client and at least one meaningful host behavior test executes.
  - Given temporary formatting, lint, compilation, or assertion defects, when the relevant command runs, then it exits unsuccessfully; after restoring each probe, all baseline commands pass.
- Affected files / contracts: `client/package.json`, `client/package-lock.json`, Client lint/format configuration and minimal shell/test files; `server/AIProductivityHub.slnx`, Server test/configuration files and only necessary host testability changes; `client/README.md`, `server/README.md`, and this plan. No wire contracts.
- Verification:
  - Client, from `client/`: `npm ci`, proposed `npm run format:check`, proposed `npm run lint`, `npm test -- --watch=false`, and `npm run build -- --configuration production`. Confirm actual runner arguments before adopting them.
  - Server, from `server/`: `dotnet restore AIProductivityHub.slnx`, `dotnet build AIProductivityHub.slnx --configuration Release --no-restore -warnaserror`, the selected runner's explicit non-interactive test command, and `dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore`. Record the exact test command and discovered test count once selected.
  - Use Red → Green for new observable behavior; run temporary negative probes in an isolated copy or worktree and preserve user changes. Record each command, expected failure, actual exit status, and restored success.
  - Actual results (2026-11-19): Passed on Windows with Node.js 24.22.0, npm 12.2.0, and .NET SDK 11.0.100. Issue #1 was re-read and remains consistent with this plan. No business AC is claimed complete.
    - Client: `npm ci`, `npm run format:check`, `npm run lint`, `npm test -- --watch=false` (2 passed), and `npm run build -- --configuration production` all passed. Production initial bundle after direct license configuration: 436.64 kB. `npm ci` and the gates also passed in an isolated source copy with its own dependency installation.
    - Server: `dotnet restore AIProductivityHub.slnx`, `dotnet build AIProductivityHub.slnx --configuration Release --no-restore -warnaserror`, `dotnet test tests/AIProductivityHub.Api.Tests/AIProductivityHub.Api.Tests.csproj --configuration Release --no-build --no-restore --settings tests.runsettings` (3 passed), and `dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore` passed. Build: zero warnings/errors. The explicit test-project command and runsettings prevent a successful empty test gate.
    - Client behavioral Red: changed shell assertion failed on `Hello, client` versus `AI Productivity Hub` (exit 1); minimal PrimeNG card implementation made both tests pass. Server tests verify existing behavior rather than introduce a new endpoint: WebApplicationFactory/TestServer returned empty HTTP 404 responses for `/`, `/api`, and `/mcp`.
    - Isolated Client negative probes: malformed spacing in `app.routes.ts` -> `npm run format:check` exit 1; unused constant -> `npm run lint` exit 1; string assigned to number -> production build exit 1 (TS2322); wrong shell-title assertion -> tests exit 1. Original bytes restored after every probe; all four baseline gates passed again.
    - Isolated Server negative probes: malformed `app.Run()` spacing -> format exit 2; invalid C# -> build exit 1; expected OK instead of NotFound -> tests exit 1 (3 failed). A separate `throw ex` probe produced CA2200 and native build exit 1. All probes removed/restored; build, 3 tests, and format passed again.
    - Zero-test probes: Client `npm test -- --watch=false --include=src/does-not-exist.spec.ts` exited 1; Server test command with `--filter FullyQualifiedName=DeliberatelyMissingTest` exited 1 using `tests.runsettings`.
    - Browser: actual CSS viewport widths 375, 768, and 1280 each matched document scroll width; Aura card rendered, authorized license removed the notice, and blue token `--p-primary-600` resolved to `#2563eb`. Browser scale required calibrating viewport overrides to measured CSS widths. The static shell contains no keyboard/touch controls. System dark theme was observed; explicit light/dark switching and full localization remain outside this slice.
    - npm audit after the scoped ESLint dependency correction reported zero vulnerabilities. npm 12 blocked optional dependency install scripts; clean install, tests, and builds succeeded without approving them.
    - Passed: final diff review, local Markdown link checks, UTF-8/plan LF and whitespace checks. No public REST/MCP, security, persistence or data contracts changed; independent review was not needed for this tooling-only slice.
    - Not Run: GitHub Actions, real Kestrel/network regression, SQL, authentication/OAuth/MCP E2E, business browser flows, and explicit theme/language controls. No remote writes or commits were made.
- Decisions:
  - PrimeNG 22.1.3, @primeuix/themes 3.0.2, and Angular CDK 22.3.0 satisfy the checked peer constraints. Retain Angular/Vitest and existing scaffold versions.
  - Use an ESLint flat config (recommended TypeScript/Angular, template accessibility, selectors and Prettier last). Use direct `eslint src --max-warnings=0`; no additional Angular lint-builder configuration is needed. Pin angular-eslint 22.6.0, @eslint/js 10.0.1, eslint-config-prettier 10.1.8, ESLint 10.15.0, and typescript-eslint 8.73.0. The last two replace the initially selected versions because npm audit identified a fixed minimatch denial-of-service advisory in those older tooling trees.
  - Per the user's explicit runner choice, adopt NUnit 5.0.0, NUnit3TestAdapter 6.3.1, Microsoft.NET.Test.Sdk 17.14.1, and Microsoft.AspNetCore.Mvc.Testing 11.0.0. Remove unused template coverage dependency. Enable .NET 11 recommended SDK analyzers, build-time code style and warnings-as-errors in Server-only Directory.Build.props. No host code changes were required.
  - PrimeNG 22 requires a PrimeUI license. Per the user's decision, this project's own Community license key is configured directly in `client/src/app/app.config.ts`, with no build-time injection; see the [Client README](../client/README.md#primeui-license).
  - Follow-up verification after the user requested direct license configuration: Client format-check, lint, 2 tests and production build passed without define arguments; production bundle contains the configured key. Removed the obsolete ignored local license file. Browser viewport checks were not repeated because the license value and rendered shell are unchanged.
  - Only scaffold formatting required by the new project-wide format gate was normalized. No business behavior, workflow files or later slice implementation was added.
- Carry-over: slice 1 is complete and uncommitted. Next slice: implement independent path-aware CI workflows (slice 2). Issue #1 remains open until slice 3 has real GitHub evidence.

### Slice 2 — Implement Independent CI Workflows

- Scope / exclusions: add `.github/workflows/client.yml` and `server.yml`, equivalent local commands, trigger rules, and stable required-check names. No deployment, branch protection, or placeholder database/integration workflows.
- Spec refs: Issue #1; [Product §1 ADR-016/017](AI_Productivity_Hub_Spec.md#1-confirmed-adrs-and-product-scope); [Architecture §10A.4](ARCHITECTURE.md#10a4-path-aware-cicd-and-change-impact).
- Depends on: slice 1 is `done` with reproducible local gates.
- Acceptance criteria:
  - Given a pull request targeting `main` or a push to `main`, when workflows run, then stable checks `Client CI` and `Server CI` are emitted with least-privilege permissions and no application or production secrets.
  - Given a Client-only change, when paths are evaluated, then Client gates execute and Server's required check resolves successfully through an explicit intentional skip; reverse this for Server-only changes.
  - Given a shared workflow, agent-instruction, tooling, dependency, or contract change, when impact is evaluated, then all affected checks execute.
  - Given any applicable gate failure, cancellation, or path-detection failure, when the final check runs, then it cannot report success. An unexpected skipped build for an affected project must also fail the final check.
  - Given an unrelated documentation-only change, when project builds are intentionally skipped, then both required checks resolve without remaining pending.
- Affected files / contracts: the two workflow files, root and/or existing project READMEs, scoped gate verification fixtures/scripts only if needed, and this plan. Required-check names are an operational contract for later branch protection.
- Verification:
  - Trigger both workflows without workflow-level path exclusions that could leave required checks pending. Use job-level path selection plus an always-evaluated final gate; explicitly distinguish intentional skips from unsuccessful execution.
  - Verify PR comparisons use the appropriate merge base and pushes cover the full pushed range, including deletes and renames. Avoid executing untrusted PR code with elevated permissions or using `pull_request_target` for builds.
  - Record the impact map in documentation: `client/**` → Client; `server/**` → Server; `.github/**`, `AGENTS.md`, common root tooling/dependencies, specification/architecture and API/MCP contracts → both. Evaluate future database/deployment changes conservatively without pretending current project builds validate SQL or deployment.
  - Test Client-only, Server-only, shared, docs-only, rename/delete, and multi-commit push cases. Test final-gate handling of success, failure, cancellation, intentional skip, unexpected skip, and detection failure.
  - Validate workflow syntax/expressions with an available workflow validator and run the equivalent local gates. Static validation does not establish GitHub execution correctness.
  - Actual results: Not Run; planning only.
- Decisions: pin reproducible toolchains using the versions verified in slice 1 and existing `global.json`; choose supported action revisions and document updates. Avoid a shared workflow abstraction unless needed for correctness.
- Carry-over: slice 2 completion establishes local/static confidence only. Issue #1 remains unfinished until slice 3 supplies actual GitHub evidence.

### Slice 3 — Verify GitHub Runs and Failure Propagation

- Scope / exclusions: exercise the real workflows, collect evidence, and fix scoped CI defects. No branch-protection configuration or deployment.
- Spec refs: Issue #1 acceptance criteria; [Architecture §10A.4](ARCHITECTURE.md#10a4-path-aware-cicd-and-change-impact).
- Depends on: slice 2 is `done`; explicit authorization for the necessary commits/pushes, test branches/PRs, and any Issue/PR evidence publication. A missing authorization leaves this slice pending; it does not authorize external writes.
- Acceptance criteria:
  - Given a clean remote checkout, when both workflows run, then each passes with actual successful run links recorded.
  - Given controlled Client and Server formatting, compilation, and test failures, and a Client lint failure, when their workflows execute, then the corresponding required checks fail. Restore each probe and record subsequent passing runs.
  - Given Client-only, Server-only, shared, and docs-only PRs, when workflows finish, then observed selection and skip results match slice 2; an applicable failure cannot be masked by a successful final gate.
  - Given complete verification, when evidence is reviewed, then every Issue acceptance criterion maps to an actual result and run/PR link; only then mark this slice and Issue implementation complete.
- Affected files / contracts: this plan, scoped workflow corrections if required, temporary verification branches/PRs, and explicitly authorized Issue/PR evidence. Keep deliberate failing probes out of the delivery diff.
- Verification: record event, changed paths, commit, toolchain, observed build selection, final check names/conclusions, test counts, and run/PR URLs for each positive and negative case. If a workflow correction is needed, rerun affected local checks and remote scenarios. No fabricated run links or simulated evidence.
- Actual results: Not Run; no publication requested or performed.
- Decisions: Issue completion and local implementation completion are separate. Hosted-runner/toolchain/network failures remain blockers rather than reasons to weaken gates.
- Carry-over: if blocked, retain `in progress` after execution starts and record the exact blocker, failed run, impact, and next action. Next proposed slice after successful completion: configure `main` branch protection as a separate user request using the verified required-check names.

## Planning Verification

- Passed: read the product specification, architecture, repository continuation skill, current scaffold configuration, and Issue #1 retrieved in this chat.
- Passed: checked branch, working tree, and installed Node.js/npm/.NET SDK versions.
- Passed: local document link targets, UTF-8 without BOM, LF, and whitespace checks. Final diff reviewed; only this plan was added.
- Not Run: dependency installation, application builds/tests, browser checks, workflow execution, and remote failure probes. No implementation slice is complete.
