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
| 2 | Independent path-aware Client and Server workflows and local documentation | done | 1 |
| 3 | Actual GitHub success, path selection, and controlled failure evidence | done | 2; explicit publication authorization |

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
  - Actual results (2026-11-19): Passed local/static gates; no hosted-run claim.
    - Preflight: `main`, clean working tree; Issue #1 re-read through the GitHub connector. Slice 1 is now committed in `997789e`, including subsequent shared Server build configuration. No commits match the slice tag. The Server README's historical format failure was not reproduced: `dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore` passed before implementation. No prerequisite code changes were needed.
    - Red: `node --test .github/scripts/ci.test.mjs` exited 1 with 4 behavioral failures against minimal stubs (independent path selection, final-result handling, Git range selection, CLI failure propagation). Green: the same command passed all 4 tests after implementation. Tests cover Client-only, Server-only, shared tooling/contracts, docs-only, real temporary Git repositories with cross-project rename/delete, multi-commit push ranges, advanced PR base/merge-base comparison, initial pushes, missing commits, invalid events/SHAs, output emission and 75 final-result combinations.
    - Workflow validation: official actionlint 1.7.12, downloaded to the temporary directory, SHA256 matched its published checksum (`6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`). `actionlint .github/workflows/client.yml .github/workflows/server.yml` exited 0. Both workflows use job-level filtering with an `always()` final check; no workflow-level path exclusions, elevated PR builds, persisted credentials, or application/production secrets.
    - Client isolated clean source copy: `npm ci`, `npm run format:check`, `npm run lint`, `npm test -- --watch=false` (2 passed), `npm run build -- --configuration production` all passed. Node 24.22.0 / npm 12.2.0; initial bundle 436.64 kB; audit reported zero vulnerabilities. npm blocked optional install scripts as before; no approvals were added.
    - Client working directory: the initial `npm ci` failed with EBUSY on the running Sass dependency; an attempted manifest/lockfile-preserving install also failed on that lock. Missing ignored dependency files were restored from the verified isolated installation, without overwriting existing files or stopping processes. Format-check, lint, 2 tests and production build then all passed locally. Package manifests and lockfile are unchanged.
    - Server: `dotnet restore AIProductivityHub.slnx`, `dotnet build AIProductivityHub.slnx --configuration Release --no-restore -warnaserror`, `dotnet test tests/AIProductivityHub.Api.Tests/AIProductivityHub.Api.Tests.csproj --configuration Release --no-build --no-restore --settings tests.runsettings` (3 passed), and `dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore` passed. SDK 11.0.100; zero build warnings/errors. .NET CLI required execution outside the sandbox for registry/cache/testhost access.
    - Passed: final diff review, scoped Prettier check, local Markdown link-target checks, UTF-8 without BOM/LF and `git diff --check`. No substantive security, application contract or data-integrity implementation changed; review was local, without an independent reviewer.
    - Not Run: actual GitHub Actions success/selection/failure probes, Windows hosted-runner execution, browser, SQL, OAuth/MCP and deployment E2E. UI and business code are unchanged. No commits, pushes, PRs, Issue comments or branch-protection changes were made.
- Decisions:
  - Keep separate workflows on `windows-2025`, matching the verified Windows project gates. Install Node 24.22.0 / npm 12.2.0 for Client and use `server/global.json` for Server SDK 11.0.100. Impact and final jobs use the Windows runner's preinstalled Node independently of project dependencies.
  - Pin official actions to verified release commits: checkout v6.1.0 `d23441a48e516b6c34aea4fa41551a30e30af803`, setup-node v6.5.0 `249970729cb0ef3589644e2896645e5dc5ba9c38`, setup-dotnet v5.4.0 `26b0ec14cb23fa6904739307f278c14f94c95bf1`. Resolved with `git ls-remote` and checked official action/workflow documentation. Disable automatic npm caching; no cache dependency or secret configuration is needed for this slice.
  - Share only the small dependency-free Node impact/final-result script and its tests, avoiding divergent path rules and allowing real Git fixtures without another filter action or reusable-workflow abstraction. Full-history Git comparisons avoid changed-file API truncation. Missing history fails closed; an initial push selects both projects. Renames participate as delete/add pairs.
  - Ordinary external Markdown can intentionally skip both builds; canonical specification/architecture/API/MCP/database documents, agent instructions, workflows, shared contract directories, root tooling and unknown non-document inputs select both. Client/Server-local Markdown selects that project. Database/deployment paths conservatively select both, without claiming their future dedicated gates exist. The README documents adding gates/impact rules when those slices introduce new contract locations.
  - Required-check names are `Client CI` and `Server CI`. Successful detection plus successful affected build or explicitly unaffected/skipped build is the only passing result. Do not configure branch protection until slice 3 establishes actual run evidence.
- Carry-over: slice 2 is complete; implementation and plan are included in the same slice commit (see Git history). Local/static confidence only. Next slice: slice 3, actual GitHub success/path-selection/controlled-failure verification after explicit publication authorization. Issue #1 remains unfinished until that evidence exists.

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
- Actual results (2026-11-19, America/Toronto): Passed all slice acceptance criteria.
  - The user explicitly authorized the proposed temporary verification branches/PRs and evidence publication by replying `continue` to the scoped authorization request. No merge, deployment, branch protection, or Issue mutation is authorized.
  - Preflight: local and remote `main` both point to `e7ae0ce4bd209792c0c7677aaf1454ba6d3397d9`; working tree was clean. Issue #1 was re-read and remains consistent. GitHub connector access works; `gh` is unavailable and local SSH remote access failed, so temporary remote commits use the connector. Local application sources remain unchanged.
  - Existing push-to-main baseline verified through actual jobs and logs: [Client 44674929321](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44674929321) and [Server 44674929366](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44674929366) passed all quality gates and final required checks. Client ran 2 passing tests with Node 24.22.0 and npm 12.2.0 installation; Server used SDK 11.0.100 and ran 3 passing tests. Both ran on the configured Windows runner.
  - Temporary draft PRs: [Client #2](https://github.com/idiotsky/ai-productivity-hub/pull/2), [Server #3](https://github.com/idiotsky/ai-productivity-hub/pull/3), [shared #4](https://github.com/idiotsky/ai-productivity-hub/pull/4), and [ordinary docs #5](https://github.com/idiotsky/ai-productivity-hub/pull/5). Evidence was published in their English PR descriptions; all four were closed without merging. Remote branches/history are retained for evidence.
  - Client-only baseline commit `2924ce7dd9361a730b5015a28d6ab8dcdd4d515d`: [Client 44675322011](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675322011) built successfully; [Server 44675322085](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675322085) intentionally skipped its build and passed `Server CI`.
  - Server-only baseline commit `5fc55b10e995074f242b7df3351e3a7b084759bd`: [Client 44675358489](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675358489) intentionally skipped its build and passed `Client CI`; [Server 44675358552](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675358552) built and passed `Server CI`.
  - Shared `.github/**` commit `540bee9cae0acd3b7d2742fb6532f44c5026f117`: [Client 44675375965](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675375965) and [Server 44675375958](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675375958) both built and passed both required checks.
  - Ordinary docs-only commit `349c198c567cfc5600d4deb89ee45e0ee2502ce6`: [Client 44675407730](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675407730) and [Server 44675407846](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675407846) intentionally skipped both builds and passed both required checks.
  - Seven isolated negative-probe commits were submitted on the temporary Client/Server branches. Each run's jobs and logs were inspected: the expected quality step exited 1, its quality job failed, and its final `Client CI` / `Server CI` failed. The opposite project's build intentionally skipped and its final check succeeded for every probe. Exact commits and results:

    | Probe | Commit | Hosted run | Observed failing step / diagnostic |
    |---|---|---|---|
    | Client format | `c6c1272002b6563b17ddf9beef546854f1785da2` | [44675442567](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675442567) | `npm run format:check`; Prettier flagged `app.routes.ts` |
    | Client lint | `e94c990e85d503c0a0af944bbb5b583f83491f16` | [44675511772](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675511772) | `npm run lint`; `no-unused-vars` |
    | Client build | `afa6ca06e4a23056461f2f934525026cc04d9a45` | [44675519087](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675519087) | Production build; TS2322 string-to-number assignment |
    | Client test | `312c17ae9d06bcadf6b99c37ec17707dc01456c7` | [44675559267](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675559267) | Unit tests; deliberately wrong shell-title assertion |
    | Server format | `00ee37d049ce90c9896c672cd1f99aaaa8808938` | [44675448165](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675448165) | `dotnet format`; WHITESPACE in `Program.cs` |
    | Server build | `6fa076d2c0bbab505b2e45b3071a0e5ee967657e` | [44675525944](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675525944) | `dotnet build`; CS1002 |
    | Server test | `b3fd47bda7fda7b0b8b45cbf6a1110c25d4791a7` | [44675567299](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675567299) | `dotnet test`; 3 failures, expected OK but received NotFound |

  - All probe files were restored to original blob SHAs. Recovery Client commit `f2296c5b1308a90cc33cf2c0b1f7598d1e1ec104`: [44675600762](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675600762) passed every gate, 2 tests, and `Client CI`; [opposite Server 44675600671](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675600671) passed via intentional skip. Recovery Server commit `456983065da24ef179d2ef95948f3fad6c1f88d2`: [44675607417](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675607417) passed every gate, 3 tests, and `Server CI`; [opposite Client 44675607442](https://github.com/idiotsky/ai-productivity-hub/actions/runs/44675607442) passed via intentional skip. Recovery logs confirm the same toolchains. All new runs use `pull_request` targeting `main` and the configured Windows runner.
  - Remote compare against `main` confirms each restored Client/Server branch contains only its temporary Markdown marker in the final diff. Deliberate defects exist only in closed verification history. No workflow correction was necessary.
  - Issue #1's seven acceptance criteria are mapped to actual evidence in PR #2 and PR #3: independent clean-checkout gates/test counts, successful runs, negative probes, independent/shared selection, intentional-skip and failure propagation, and documented stable names/local commands. Issue #1 remains open; its body/checklist/comments were not changed because this authorization covered PR evidence only. Implementation completion is separate from administrative Issue closure.
  - Local `node --test .github/scripts/ci.test.mjs`: 4 passed; `git diff --check`: passed. No application or workflow code has changed.
  - Passed: final evidence/diff review and local Markdown link/UTF-8/whitespace checks. Review was local; no independent reviewer was used for this evidence-only change. No application or workflow code changed.
  - Not Run: new browser, SQL, OAuth/MCP, deployment or business-flow checks; this slice only verifies existing CI. Hosted cancellation, missing-history and unexpected-skip injection were not added; those cases retain slice 2's local behavioral coverage. No deployment, merge, branch-protection or Issue mutations were made. Commit evidence for this plan update is tracked in Git history.
- Decisions: Issue completion and local implementation completion are separate. Hosted-runner/toolchain/network failures remain blockers rather than reasons to weaken gates. Preserve closed verification branches and run history for review instead of merging or deleting the probes. The completed evidence is published through the authorized PR descriptions; the local plan remains the slice-status handoff.
- Carry-over: slice 3 is complete. No failed checks remain after restoring probes. Issue #1 can be updated/closed separately using the published evidence when requested. Exactly one next proposed slice: configure `main` branch protection using verified required-check names `Client CI` and `Server CI`, as a new user request.

## Planning Verification

- Passed: read the product specification, architecture, repository continuation skill, current scaffold configuration, and Issue #1 retrieved in this chat.
- Passed: checked branch, working tree, and installed Node.js/npm/.NET SDK versions.
- Passed: local document link targets, UTF-8 without BOM, LF, and whitespace checks. Final diff reviewed; only this plan was added.
- Not Run: dependency installation, application builds/tests, browser checks, workflow execution, and remote failure probes. No implementation slice is complete.
