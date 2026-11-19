# AI Productivity Hub — Product Requirements & Acceptance Criteria

> **AI Productivity Hub · v1.3.2 · 2026-11-19**  
> Design only; no application code. Based on approved source `AI_Productivity_Hub_Spec_v1.3.2.md`.

**Authority:** Functional requirements and the confirmed ADR list. Technical details reside in their respective documents; avoid duplicating the schema or protocol definitions here.

**Release scope:** P0 items are required for initial usable release; P1 enhancements are deferred. Approved decisions may only change via owner-approved ADR.


## Documentation Map

- [AI_Productivity_Hub_Spec.md](AI_Productivity_Hub_Spec.md) — Product goals, features, business rules, acceptance criteria and roadmap (requirements authority).
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technology stack, Monorepo, module boundaries, deployment and CI (architecture authority).
- [DATABASE.md](DATABASE.md) — Database schema, `_History` triggers, `rowversion` and constraints (database authority).
- [API.md](API.md) — Unversioned REST `/api`, search endpoints, errors and wire contracts (REST authority).
- [MCP.md](MCP.md) — Remote MCP `/mcp`, OAuth, permissions, approvals and tool contracts (MCP authority).
- [../AGENTS.md](../AGENTS.md) — AI coding agent operating rules and required reading order.

---

## 1. Confirmed ADRs and Product Scope

| ID | Decision |
|---|---|
| ADR-001 | Self-hosted on **Windows + Nginx + ASP.NET Core Kestrel** (no IIS) |
| ADR-002 | **ASP.NET Core / .NET 11**, **EF Core 11**, SQL Server |
| ADR-003 | **Angular 22 + PrimeNG 22**, responsive mobile-first UI, PrimeNG Aura, default theme System, primary `#2563EB` |
| ADR-004 | Single personal owner account at launch, but all owned resources retain `UserId` for future multi-user expansion |
| ADR-005 | Login required; brute-force protection, account lockout, rate limits, optional TOTP 2FA and recovery codes; public registration disabled |
| ADR-006 | **Single global active timer per user**; switching tasks atomically ends A and starts B at the same server timestamp |
| ADR-007 | Work and personal tasks together, organized by configurable Areas / optional Projects / Tasks / Subtasks |
| ADR-008 | A TimeEntry's `AreaId` is a historical snapshot; moving its Task does not rewrite historical attribution |
| ADR-009 | External-AI-first: **Remote MCP + OAuth**, backed by the same application services as REST; internal AI deferred |
| ADR-010 | Ordinary permitted AI creates/updates can run directly; high-risk mutations require server-enforced owner approval |
| ADR-011 | REST URLs use **`/api` without a version segment**; MCP endpoint `/mcp` |
| ADR-012 | All internal entity IDs: `long` / `bigint`; optimistic concurrency **SQL Server `rowversion`** |
| ADR-013 | SQL Server **business-table history tables + DML triggers**, and separate action-level audit events |
| ADR-014 | Optional SQL Server Full-Text Search when justified by search needs |
| ADR-015 | Modular Monolith; no microservices, Redis, queues, Kubernetes or built-in LLM in P0 |
| **ADR-016** | **Single Git Monorepo** (`client/`, `server/`, `database/`, `Docs/`, `deploy/`, `.github/workflows/`); separate client/server builds, tests and deployment artifacts |
| **ADR-017** | DB schema migrations and all `<TableName>_History` trigger definitions are Git-versioned and deployed through one controlled migration path; path-filtered CI plus API cross-stack contract checks; root `AGENTS.md` controls AI agent workflows |

### 1.1 Objective

Capture -> Plan -> Execute -> Review -> Improve: understand what needs to be done, where time was spent, how estimates compare with reality, and which adjustments are warranted. Tracking is factual; AI analyses are hypotheses supported by structured data.

### 1.2 P0 Deliverables

- Account login/logout/session management, brute-force defense, optional TOTP 2FA/recovery and owner-only security settings.
- Areas, Projects, Tasks/Subtasks, priorities, statuses, tags, estimated duration revision history.
- Global timer (start / stop / atomic switch), manual time entries, historical correction with authorization, time timeline.
- Today dashboard, Tasks, Projects, Time, Insights, Settings; English/Simplified Chinese; responsive layout.
- REST API, Remote MCP with OAuth, scoped authorization, idempotency, operation approval, auditing.
- SQL Server history tables, set-based DML triggers, integrity/concurrency tests, backup/recovery.
- Basic analytics: time by Area/Project/Task, estimates vs actual, completion trends.

### 1.3 Deferred / Out of Scope

Team assignments, Sprint, Jira-like workflow, Gantt, complex recurring tasks, billing, calendar/third-party syncing, native mobile apps, autonomous AI background scheduling, built-in AI chat/provider implementation, machine learning training. Reviews saved to the app and advanced analytics are P1.

---
## 2. Domain Model and Business Rules

### 2.1 Area / Project / Task

- Each `Area` belongs to a User. Each `Project` belongs to an Area. Each `Task` belongs to an Area; `ProjectId` and `ParentTaskId` are optional.
- A Task and all descendants must have a consistent Area/Project. Moves are explicit **transactional subtree operations**, checked for cycles, authorization, and destination consistency.
- Default Areas are configurable, not hard-coded enum values:

| SystemKey | English | Simplified Chinese | Suggested TrackingCategory |
|---|---|---|---|
| `area.work` | Work | 工作 | Productive |
| `area.personal` | Personal | 个人 | Personal |
| `area.learning` | Learning | 学习 | Productive |
| `area.fitness` | Fitness | 健身 | Personal |
| `area.entertainment` | Entertainment | 娱乐 | Personal |
| `area.shopping` | Shopping | 购物 | Personal |
| `area.rest` | Rest | 休息 | Rest |

`TrackingCategory`: `Productive | Personal | Rest | Unclassified`, editable as classification (not a value judgment). Default-Area names are localized by `SystemKey` until user overrides `Name`.

- Task statuses: `Inbox`, `Todo`, `InProgress`, `Blocked`, `Done`, `Cancelled`.
- Task priorities: `None`, `Low`, `Normal`, `High`, `Urgent` (default `Normal`).
- A Task need not have a due date, estimate, or Project. Completing a Task does **not** result from timer stop. Parent completion with open children requires an explicit decision.
- `TaskEstimate` revisions are append-only; first effective estimate is Original; latest is Current. No authoritative duration field stored on Task. Distinguish unset estimate from zero; valid estimates are > 0.
- `DueDate` and `PlannedStartDate` are date-only; schedule blocks are deferred. `CompletedAt` is a UTC instant.

### 2.2 Time Tracking

- At most **one active TimeEntry per User** (`EndAt IS NULL AND ArchivedAt IS NULL`). The SQL filtered unique index enforces this independently of application logic.
- Timer states are **Idle** and **Running** only. Pause = Stop; Resume = a new TimeEntry for the same Task.
- Start when another timer is active returns conflict; it does not silently switch.
- Stop requires the expected active TimeEntry ID. Switch requires the expected active ID and target Task or Area.
- Switch happens in **one transaction** and uses one server timestamp `T`: old `EndAt=T`, new `StartAt=T`. No artificial gap/overlap, including across Areas.
- Manual / external-AI created time entries must have both StartAt and EndAt. `EndAt > StartAt`.
- TimeEntry can have `TaskId=NULL`, but must belong to an Area. The Area ID is preserved as a historical snapshot when the Task is moved.
- No overlapping active/non-archived time intervals for a user by default. For INSERT, UPDATE, manual corrections and SWITCH, use a common per-user serialized transaction/lock strategy; do not assume a CHECK constraint can prevent range overlap.
- No automatically persisted `DurationSeconds` as source of truth: derive elapsed time from `StartAt`, `EndAt` or server-now for the active timer. Client UI countdown is only presentation.
- TimeEntry corrections and archival require appropriate permission, owner approval for external AI, and full history/audit.
- Rollups: `DirectActualSeconds` = task-linked entries; `TotalActualSeconds` = task plus descendants. Project totals aggregate entries exactly once, never sum overlapping inclusive parent totals.

### 2.3 Analytics

- Cross-midnight time is split across the user's **local calendar days** using their selected time zone (IANA identifier preferred, e.g. `America/Toronto`).
- Area historical time is grouped by **TimeEntry.AreaId**, not Task's current Area.
- Variance = Actual - OriginalEstimate; percent = Variance / OriginalEstimate × 100. Calculate official variance only for completed tasks with positive estimates. State handling for archived, cancelled and in-progress tasks explicitly.
- Distinguish tracked time, productive-category time, rest, and personal time. Do not claim total tracked time is a productivity score.
- All analytics responses state period, timezone, filters, generation time and metric semantics.

---
## 11. Engineering Backlog (Epics)

| Epic | Scope / Must-have Issues |
|---|---|
| E01 Foundation | Monorepo root scaffold/AGENTS.md; Angular 22/PrimeNG 22 shell; .NET 11 Modular Monolith; EF Core 11 SQL setup; common REST errors; logging, health endpoints; rowversion serialization helpers |
| E02 Identity | Long-key Identity owner bootstrap; login/session; lockout + throttling; TOTP + recovery; secure settings; OAuth identity foundation |
| E03 Task Management | Seven default Areas; Project; Task CRUD and moves; subtask cycle protection; estimate revisions; tags and activities |
| E04 Time Tracking | Filtered unique active timer index; start/stop/switch atomicity; manual logs; overlap locking; local-day handling |
| **E05 History (NEW)** | History table conventions; per-table DML triggers; secure actor correlation via SESSION_CONTEXT; secret exclusions; migrations and indexes; bulk/rollback tests; immutable history permissions |
| E06 Analytics | Time and Area attribution, parent rollups, estimate variance, summary/daily APIs |
| E07 REST + MCP | Unversioned REST OpenAPI; OAuth Remote MCP; read tools; write tools; rowversion expected token; scopes; idempotency; approvals |
| E08 Frontend | Today, Tasks, Projects, Time, Insights, Settings, Login/2FA, locale, theme |
| E09 Search | Basic search and authorized filters; optional FTS evaluation/indexing |
| E10 Deploy + QA | GitHub Actions path-aware Client/Server/Database/Integration workflows; independent release artifacts; Windows Nginx/Kestrel service deployment; HTTPS; backups; concurrency/security/history tests; end-to-end MCP OAuth compatibility |

### Suggested Sequence

1. **Repository baseline:** establish Monorepo directory boundaries, root `AGENTS.md`, canonical specification paths and CI quality gates.
2. **Technical spikes:** .NET 11/EF Core 11 build and migration, Windows Nginx + Kestrel, minimal Remote MCP + OAuth with target external client.
3. Foundation and identity.
4. Source schema, **history tables/triggers together**, and Area/Project/Task.
5. Timer + time-entry concurrency and trigger verification.
6. Frontend daily workflow and analytics.
7. Remote MCP read/write, scopes, approvals and audits.
8. Search tuning, production deployment and security/performance/regression tests.

### Definition of Done

Every change includes acceptance tests and documentation; altered tracked tables require trigger/history migration and verified multi-row behavior; every update to a mutable business entity enforces rowversion; every API/MCP call enforces ownership/Area grants; security-sensitive flows are audited; build/lint/format/tests pass. AI coding agents may not weaken these gates without explicit approval.

---
## 12. Acceptance Criteria (P0)

| ID | Scenario | Expected |
|---|---|---|
| AC-01 | Anonymous access to task/time API | Authentication required |
| AC-02 | Repeated failed login | Lockout/rate limiting without leaking username validity |
| AC-03 | Optional TOTP enabled | Password alone cannot complete login; recovery code is single-use |
| AC-04 | Create task without project | Allowed in valid Area |
| AC-05 | Cycle in subtask tree | Rejected |
| AC-06 | Change estimate | New append-only revision |
| AC-07 | Concurrent updates with old `rowVersion` | One succeeds, stale update rejected; no lost update |
| AC-08 | Refresh browser or restart Kestrel with running timer | Current timer restored from DB |
| AC-09 | Concurrent timer starts | At most one active timer |
| AC-10 | Switch A to B | Old.EndAt = New.StartAt, transactional |
| AC-11 | Manual time overlaps existing entry | Rejected with conflict |
| AC-12 | Move task from Work to Personal | Past TimeEntry.AreaId remains Work |
| AC-13 | Cross-midnight time entry | Accurate local-day totals |
| AC-14 | Parent + child rollup | No double-counting |
| **AC-15** | Insert/Update/Delete audited business record | Correct trigger-created history snapshot |
| **AC-16** | Bulk update 100 audited rows | 100 correct history rows, set-based trigger |
| **AC-17** | Source write/trigger fails | Whole transaction rolls back |
| **AC-18** | Stale rowversion write rejected | No committed history for rejected write |
| **AC-19** | Timer switch | History of A update and B insert committed together |
| **AC-20** | History table mutation using app login | Denied |
| **AC-21** | Sensitive auth/secret changes | Secrets absent from generic history/audit payloads |
| AC-22 | MCP OAuth invalid audience or missing Area scope | Rejected |
| AC-23 | MCP ordinary create | Authorized success + audit + history |
| AC-24 | MCP historical time correction | Requires Owner approval, then re-checks rowversion |
| AC-25 | Retried write with same idempotency key | No duplicate mutation/history |
| AC-26 | Language toggle | UI changes; user-entered text intact |
| AC-27 | No AI API key | All non-AI app features and REST/MCP function |
| AC-28 | Restore DB and app signing/data-protection keys | Data and authentication continuity verified |

---
## 13. Open Items / Implementation Notes (Non-Blocking)

1. Select a mature .NET-compatible OAuth server library and verify MCP clients' discovery/consent behavior before full implementation.
2. Choose a consistent JSON representation for `long` IDs. **Recommended:** decimal strings for browser/AI interoperability, even while C# uses `long`.
3. Select the exact set of business tables with history triggers in the first migration; mandatory list in [DATABASE.md §4.1](DATABASE.md#41-purpose-and-scope) is the minimum.
4. Determine archival and retention for security logs independently from core business history.
5. Establish SQL database connection and `SESSION_CONTEXT` transaction helper to ensure verified attribution and connection-pooling isolation.
6. Decide whether to expose owner-only read-only history views in v1.3.2 P0 or P1; mutation to history is never allowed.
7. Benchmark Windows Nginx MCP streaming, Kestrel availability, timer/history trigger overhead and backup restore before public release.
