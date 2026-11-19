# AI Productivity Hub — Architecture & Repository

> **AI Productivity Hub · v1.3.2 · 2026-11-19**  
> Design only; no application code. Based on approved source `AI_Productivity_Hub_Spec_v1.3.2.md`.

**Authority:** Stack, module boundaries, deployment, repository topology and CI. Source of truth for table details is [DATABASE.md](DATABASE.md), REST in [API.md](API.md), and MCP in [MCP.md](MCP.md).

### Architecture invariants

- Windows + Nginx + Kestrel; ASP.NET Core / .NET 11, EF Core 11, SQL Server; Angular 22 + PrimeNG 22.
- Modular Monolith. Client, REST and MCP call the same application services; only the server accesses the database.
- One Monorepo; Client and Server remain independently buildable/testable/deployable.
- No built-in AI assistant in P0, only a future integration boundary.


## Documentation Map

- [AI_Productivity_Hub_Spec.md](AI_Productivity_Hub_Spec.md) — Product goals, features, business rules, acceptance criteria and roadmap (requirements authority).
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technology stack, Monorepo, module boundaries, deployment and CI (architecture authority).
- [DATABASE.md](DATABASE.md) — Database schema, `_History` triggers, `rowversion` and constraints (database authority).
- [API.md](API.md) — Unversioned REST `/api`, search endpoints, errors and wire contracts (REST authority).
- [MCP.md](MCP.md) — Remote MCP `/mcp`, OAuth, permissions, approvals and tool contracts (MCP authority).
- [../AGENTS.md](../AGENTS.md) — AI coding agent operating rules and required reading order.

---

## 9. Windows + Nginx + Kestrel Deployment

- Nginx hosts Angular static assets and proxies `/api`, `/mcp` and OAuth endpoints to Kestrel loopback. HTTPS externally. SQL Server private, not directly Internet-reachable.
- Run Nginx and ASP.NET Core as managed Windows services with recovery restart, structured logs and controlled updates.
- Configure trusted proxy forwarding, TLS, request limits, timeouts/streaming appropriate to MCP transport, Origin checks and health probes.
- **Risk:** official Nginx Windows build has limitations relative to Linux; validate sustained operation, MCP connection behavior, safe shutdown/restart and logs before release. Do not silently replace with IIS.
- Daily SQL backups, encrypted secret/key material backups, recovery drills, Data Protection/OAuth signing key retention. Restart must not end active timers because their state is persisted in TimeEntries.

---
## 10. UI Requirements

- Views: `/today`, `/tasks`, `/projects`, `/time`, `/insights`, `/settings` plus `/login` and TOTP enrollment/challenge flows. Responsive mobile-first design and desktop sidebar.
- Global timer visible during use; Task create/complete/track accessible with minimal clicks. Task details side panel on desktop, full screen on small screens.
- English and Simplified Chinese, browser-language initial default with English fallback, language preference persisted. Light/Dark/System, default System, PrimeNG Aura, blue primary `#2563EB`.
- Preserve list filters/search on navigation. Display durations, task rollups, and Area historical classifications without mixing total logged time with productivity.
- Internal AI chat/provider settings are not implemented; integration settings show OAuth/MCP client authorizations and management.

---
### 10A.1 Repository model

**Decision:** A **single Git Monorepo** named `ai-productivity-hub` (recommended repository name) contains the Angular client, ASP.NET Core server, database artifacts, deployment configuration, documentation, and CI workflows. This is a repository boundary decision, **not** a requirement to combine frontend and backend into one build artifact.

- Client and Server remain separate projects with separate dependencies, build commands, tests, release packages and deployment steps.
- Angular remains deployable as static assets served by Windows Nginx; ASP.NET Core 11 runs under Kestrel on Windows behind the same reverse proxy.
- Backend Application Services are shared by REST and Remote MCP; neither the UI nor MCP handler bypasses them.
- One pull request/commit can change API contracts and both sides together to preserve consistency.
- Changes to historical table schemas, triggers, constraints or indexes are reviewed as database changes, not incidental SQL edits.
### 10A.2 Canonical repository layout

```text
ai-productivity-hub/
├── client/                     # Angular 22 + PrimeNG 22 application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── angular.json
├── server/                     # ASP.NET Core 11 solution
│   ├── src/
│   │   ├── AIProductivityHub.Api/
│   │   ├── AIProductivityHub.Application/
│   │   ├── AIProductivityHub.Domain/
│   │   ├── AIProductivityHub.Infrastructure/
│   │   └── AIProductivityHub.Mcp/
│   ├── tests/
│   └── AIProductivityHub.slnx
├── database/
│   ├── migrations/             # migration manifests/documentation, as needed
│   ├── triggers/               # canonical <TableName>_History trigger definitions
│   └── scripts/                # checked-in non-secret maintenance SQL
├── Docs/
│   ├── AI_Productivity_Hub_Spec.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── MCP.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   ├── ROADMAP.md
│   └── DECISIONS.md
├── deploy/
│   ├── nginx/                  # Windows Nginx configuration templates
│   └── windows/                # Kestrel/Windows service deployment assets
├── .github/workflows/
│   ├── client.yml
│   ├── server.yml
│   ├── database.yml
│   └── integration.yml
├── AGENTS.md                   # mandatory AI agent repository instructions
├── .gitignore
└── README.md
```

Documentation uses the existing `Docs/` directory. The layout is the **target structure**, not evidence that these files already exist. `SECURITY.md`, `DEPLOYMENT.md`, `ROADMAP.md` and `DECISIONS.md` are optional future extractions; until created, their subjects remain in [MCP.md](MCP.md), this architecture document, and [the product specification](AI_Productivity_Hub_Spec.md). Implementation agents should create them incrementally as authorized; avoid scaffolding unused modules or placeholder code solely to fill every path.
### 10A.3 Database migration and History Trigger source of truth

1. `database/triggers/` contains the **canonical reviewed source** for SQL Server DML triggers maintaining `<SourceTableName>_History` tables (e.g., `Tasks_History`).
2. **EF Core migrations are the single controlled deployment path** for schema changes and trigger installation/alteration/removal; the scripts in `database/triggers/` are inputs to those migrations, not a competing independent deploy mechanism.
3. Each tracked-table schema change must update: the source table migration, its `_History` schema, relevant trigger definition, schema documentation and tests **in the same reviewed change**.
4. Verify `INSERT`, `UPDATE`, `DELETE`, multirow statements, rollback behavior, protected-secret exclusions, and actor attribution via `SESSION_CONTEXT`.
5. Do not directly edit production database objects or history contents outside the approved migration/recovery procedure. A migration must be repeatable, reviewable and covered by backup/rollback planning.
6. History snapshots and separate `AuditEvents` serve different purposes. Trigger history is database-enforced; operation-level audit captures actor, source and approval context.
### 10A.4 Path-aware CI/CD and change impact

| Changed paths | Required checks |
|---|---|
| `client/**` | Client install/build, format/lint, unit tests, localization checks where affected |
| `server/**` | .NET restore/build, format/analyzers, unit and applicable integration tests |
| `database/**` | SQL migrations and History trigger validation against disposable SQL Server, including multirow and rollback tests |
| `Docs/API.md`, relevant REST contracts, or server DTOs | Cross-stack API contract validation plus affected Client and Server tests |
| `Docs/MCP.md`, MCP Tool schemas, OAuth endpoints | MCP schema, security and target-client compatibility tests |
| `deploy/**` | Deployment config validation and Windows Nginx/Kestrel smoke checks |
| `AGENTS.md`, common build/tooling or shared workflows | Evaluate and run all impacted checks, potentially full CI |

Use GitHub Actions path filters to **avoid unrelated builds**, but do not rely solely on a changed-directory heuristic: shared contracts, dependencies, database migrations and security-sensitive changes must trigger impacted integration checks. Client and Server should have independent release artifacts and deployment steps; production promotion may coordinate their compatible versions.
### 10A.5 Document ownership and maintenance

| Document | Ownership |
|---|---|
| `Docs/AI_Productivity_Hub_Spec.md` | Binding product requirements, ADR decisions, domain rules and release scope |
| `Docs/ARCHITECTURE.md` | Detailed project/module boundaries, repository structure and build/deploy dependencies |
| `Docs/DATABASE.md` | Exact table schema, `_History` naming/trigger contract, indexes, migrations and rowversion behavior |
| `Docs/API.md` | REST `/api` endpoints, DTOs, errors and contract compatibility |
| `Docs/MCP.md` | Remote MCP Tools, OAuth, permissions, approvals and protocol compatibility |
| `Docs/DECISIONS.md` (future) | ADR chronology if extracted; confirmed ADRs currently live in [the product specification](AI_Productivity_Hub_Spec.md) |
| Root `AGENTS.md` | AI Coding Agent operating instructions and quality gates, subordinate to product/architecture spec |
| `client/AGENTS.md` / `server/AGENTS.md` (optional) | Narrow, compatible frontend/backend guidance only when useful |
