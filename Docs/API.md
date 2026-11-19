# AI Productivity Hub — REST API Contract

> **AI Productivity Hub · v1.3.2 · 2026-11-19**  
> Design only; no application code. Based on approved source `AI_Productivity_Hub_Spec_v1.3.2.md`.

**Authority:** HTTP `/api` endpoints, DTO rules, error handling and compatibility. There is **no URL version segment**. Long-valued entity IDs should be serialized consistently as decimal strings to avoid JavaScript 64-bit precision loss (final wire schema must enforce this). `rowVersion` wire values are Base64 strings.

Read ownership/Area-grant requirements in [MCP.md](MCP.md) and database guarantees in [DATABASE.md](DATABASE.md).


## Documentation Map

- [AI_Productivity_Hub_Spec.md](AI_Productivity_Hub_Spec.md) — Product goals, features, business rules, acceptance criteria and roadmap (requirements authority).
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technology stack, Monorepo, module boundaries, deployment and CI (architecture authority).
- [DATABASE.md](DATABASE.md) — Database schema, `_History` triggers, `rowversion` and constraints (database authority).
- [API.md](API.md) — Unversioned REST `/api`, search endpoints, errors and wire contracts (REST authority).
- [MCP.md](MCP.md) — Remote MCP `/mcp`, OAuth, permissions, approvals and tool contracts (MCP authority).
- [../AGENTS.md](../AGENTS.md) — AI coding agent operating rules and required reading order.

---

## 6. REST API Contract (No URL Version)

**Base:** `https://<host>/api` — **no `/v1`**. MCP: `https://<host>/mcp`. All business routes require appropriate authentication and resource authorization.

### 6.1 Global Conventions

- JSON over HTTPS; stable English field names and enums. Cursor pagination: default 25, max 100; search/filter/sort server-side.
- IDs are JSON integers (`long`), while OAuth/opaque IDs follow protocol types. Clients must preserve 64-bit integer precision (in JavaScript, use validated string representation for IDs if they may exceed `Number.MAX_SAFE_INTEGER`; API contract should choose and enforce a consistent serialization strategy). **Recommended public JSON long IDs as decimal strings** to avoid precision loss in Angular/AI JS environments; database/C# still `long`. This normalization applies to all entity IDs and relationships.
- `rowVersion` and `expectedRowVersion`: **Base64-encoded binary(8)**. For update/archival/move and other relevant state changes client provides `expectedRowVersion`. Do not accept arbitrary `version` numbers. `412 VERSION_CONFLICT` on stale rowversion; `409` for domain/timer state conflicts.
- `Idempotency-Key` required on externally automated write actions and recommended on browser writes. Duplicates with same request hash return prior logical result, different body returns `409 IDEMPOTENCY_CONFLICT`.
- Error payload based on Problem Details with stable `code`, `traceId`; 401 unauthenticated, 403 forbidden, 404 not found/hidden, 409 domain conflict, 412 optimistic concurrency conflict, 422 business rule, 429 rate limit.
- UTC timestamps ISO 8601; local date filter is inclusive date range, translated to half-open UTC range using requested User timezone.
- Versionless URL does **not** mean ungoverned breaking changes. Preserve backward compatibility and OpenAPI contract with migration notes.

### 6.2 Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login (may yield 2FA challenge) |
| POST | `/api/auth/2fa/verify` | Verify second factor |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current authenticated user |
| POST | `/api/auth/2fa/setup` | Start TOTP enrollment |
| POST | `/api/auth/2fa/enable` | Confirm enable |
| POST | `/api/auth/2fa/disable` | Disable with recent reauthentication |
| GET/PATCH | `/api/settings` | User settings with rowversion |
| GET/POST | `/api/areas` | List/create Areas |
| GET/PATCH | `/api/areas/{id}` | Area detail/update |
| POST | `/api/areas/{id}/archive` | Archive Area |
| GET/POST | `/api/projects` | List/create Projects |
| GET/PATCH | `/api/projects/{id}` | Project detail/update |
| POST | `/api/projects/{id}/archive` | Archive Project |
| GET/POST | `/api/tasks` | Search/list/create Tasks |
| GET/PATCH | `/api/tasks/{id}` | Detail/update ordinary fields |
| POST | `/api/tasks/{id}/complete` | Complete Task |
| POST | `/api/tasks/{id}/reopen` | Reopen Task |
| POST | `/api/tasks/{id}/move` | Move subtree safely |
| POST | `/api/tasks/{id}/archive` | Archive Task |
| POST | `/api/tasks/batch` | Atomic batch create; dryRun supported |
| GET/POST | `/api/tasks/{id}/estimates` | Revision history/add revision |
| GET/POST | `/api/tasks/{id}/activities` | Journal/list/add |
| GET | `/api/timer/current` | Active timer or null |
| POST | `/api/timer/start` | Start one active timer |
| POST | `/api/timer/stop` | Stop expected active TimeEntry |
| POST | `/api/timer/switch` | Atomic end A/start B at timestamp T |
| GET/POST | `/api/time-entries` | List/manual log |
| GET/PATCH | `/api/time-entries/{id}` | Detail/correction |
| POST | `/api/time-entries/{id}/archive` | Archive entry |
| GET | `/api/analytics/summary` | High-level metrics |
| GET | `/api/analytics/time-distribution` | Per area/project/task |
| GET | `/api/analytics/estimate-variance` | Estimate comparison |
| GET | `/api/analytics/completions` | Completion trend |
| GET | `/api/analytics/daily` | Local-day split |
| GET | `/api/search?q=...` | Authorized global search |
| GET | `/api/approvals` | Pending approvals |
| GET | `/api/approvals/{id}` | Approval details |
| POST | `/api/approvals/{id}/approve` | Approve in Owner session |
| POST | `/api/approvals/{id}/reject` | Reject in Owner session |
| GET | `/api/integrations` | Clients/authorizations |
| POST | `/api/integrations/tokens` | Create owner-script PAT |
| POST | `/api/integrations/tokens/{id}/revoke` | Revoke PAT |

History reads (P1): `GET /api/tasks/{id}/history`, `GET /api/time-entries/{id}/history`. Never expose generic history UPDATE/DELETE APIs.

### 6.3 Key Payload Rules

- `tasks.create`: `title`, `areaId`, optional `projectId`, `parentTaskId`, `description`, `priority`, `dueDate`, `estimateSeconds`, `tagIds`. Returns entity ID and Base64 rowVersion.
- `tasks.patch`: limited editable fields plus `expectedRowVersion`; moves and estimates use dedicated endpoints.
- `timer.start`: `taskId?`, `areaId?`, `note?`; when no task, Area required. Active timer -> `409 TIMER_ALREADY_RUNNING`.
- `timer.stop`: `expectedTimeEntryId`, optional `note`, and optionally current rowversion for stronger CAS. Server picks EndAt.
- `timer.switch`: `expectedTimeEntryId`, `targetTaskId?`, `targetAreaId?`, `previousEntryNote?`; one transaction, one server timestamp, return `stoppedEntry`, `startedEntry`, `switchAt`, `serverNow` and rowversions.
- `time_entries.create`: `areaId`, `taskId?`, `startAt`, `endAt`, `note?`; server validates overlap and ownership.
- All mutation endpoints preserve history through triggers and actor context setup, even when initiated by MCP.

---
## 8. Search

- Default structured filters use ordinary indexes: User/Area/Project/Status/Priority/DueDate.
- Basic text search on Task Title/Description and Project Name/Description first.
- **SQL Server Full-Text Search optional** for Task description, TaskActivity content, TimeEntry notes and project descriptions when tested query quality/volume justifies it.
- Evaluate Chinese word breakers, English morphology, code symbols (e.g. `JWTAuthService`, `ASP.NET`) and prefix/substring fallback. Do not assume FTS handles all code identifiers or Chinese partial matches.
- All search paths must enforce User and Area authorization.

---
