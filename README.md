# AI Productivity Hub

A self-hosted app for personal task management, time tracking and productivity insights, with external AI access through Remote MCP and OAuth.

**Status:** Client and Server scaffolds exist. Product features are not implemented yet.

## Planned Stack

- Angular 22 + PrimeNG 22
- ASP.NET Core 11 + EF Core 11 + SQL Server
- Windows + Nginx + Kestrel
- One Monorepo with independent Client and Server builds

## Documentation

- [Product specification](Docs/AI_Productivity_Hub_Spec.md) — scope, business rules and acceptance criteria.
- [Architecture](Docs/ARCHITECTURE.md) — structure, UI, deployment and CI.
- [Database](Docs/DATABASE.md) — schema, concurrency and history triggers.
- [REST API](Docs/API.md) — endpoints and wire contracts.
- [MCP and security](Docs/MCP.md) — tools, OAuth, permissions and approvals.

## Development

Read [AGENTS.md](AGENTS.md) before making changes; it defines the development workflow and shared skill setup.

See [Client setup](client/README.md) and [Server setup](server/README.md) for independent development commands.

## Continuous integration

[Client](.github/workflows/client.yml) and [Server](.github/workflows/server.yml)
run on every pull request targeting `main` and every push to `main`. There are
no workflow-level path exclusions. Stable final check names for later branch
protection are **Client CI** and **Server CI**; use these rather than the
conditional quality-gate job names. Branch protection is not configured here.

| Changed paths | Builds selected |
|---|---|
| `client/**` | Client |
| `server/**` | Server |
| Any `AGENTS.md` / `CLAUDE.md`, `.agents/**`, `.claude/**`, `.github/**` | Both |
| `Docs/AI_Productivity_Hub_Spec.md`, `ARCHITECTURE.md`, `API.md`, `MCP.md`, `DATABASE.md` | Both |
| Any `contracts/`, `dtos/`, or `schemas/` directory (case-insensitive) | Both |
| Other paths outside Client/Server, except Markdown | Both, conservatively |
| Other Markdown outside Client/Server, such as this README or the implementation plan | Neither |

The five contract documents above all live in `Docs/`. Client/Server-local
Markdown runs its project's gates (Client formatting includes Markdown).
Root tooling/dependency files and future `database/**` / `deploy/**` inputs run
both builds. These builds do **not** validate SQL, deployment, OAuth or MCP;
add their specific gates with the first relevant implementation slice. Update
the impact map and its tests whenever new contract locations are introduced.

Detection uses a full-history checkout and Git, without changed-file API limits:
PRs compare their head against the merge base with the event's base commit;
pushes compare the entire event `before` → `after` range. Rename detection is
disabled so both old and new paths participate, including deletions. Initial
pushes with an all-zero `before` run both builds. Missing commits, invalid
events, or detection/test errors fail detection rather than skip successfully.

Each final check runs with `always()` and accepts only successful detection plus
either a successful affected build or an explicitly unaffected, skipped build.
Failed/cancelled detection or builds, missing outputs, and unexpected skips
cannot pass. Workflow cancellation itself cannot produce a successful required
check. Every job has a timeout. Workflows use only `contents: read`, disable
persisted checkout credentials, and use no application/production secrets or
`pull_request_target` builds.

Both use `windows-2025`. Client installs Node.js 24.22.0 and npm 12.2.0; Server
installs the SDK from `server/global.json` (11.0.100). Detection/final scripts
use the runner's preinstalled Node.js, independently of either project's
dependencies. Actions are pinned to verified full commit SHAs: checkout 6.1.0,
setup-node 6.5.0, setup-dotnet 5.4.0. When updating them, resolve the official
release tag to its commit, update SHA/version comments together, rerun static
and local checks, then verify actual GitHub runs before changing required checks.

Equivalent local project gates are listed in the setup links above. From the
repository root, verify CI selection and result handling with no npm install:

```powershell
node --test .github/scripts/ci.test.mjs
actionlint .github/workflows/client.yml .github/workflows/server.yml
```

Use the official [actionlint release](https://github.com/rhysd/actionlint/releases)
(validated here with 1.7.12). Tests create isolated temporary Git repositories;
they cover independent/shared/docs paths, PR merge bases, multi-commit pushes,
rename/delete inputs and final-result combinations. Static/local checks do not
establish hosted-runner correctness. Actual GitHub success, selection and failure
evidence remains [Foundation CI slice 3](Docs/Foundation-CI-Plan.md#slice-3--verify-github-runs-and-failure-propagation).

Workflow design references: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[status expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions),
and official [checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node), and
[setup-dotnet](https://github.com/actions/setup-dotnet) documentation.
