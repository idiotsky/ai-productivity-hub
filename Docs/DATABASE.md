# AI Productivity Hub — SQL Server Database & History

> **AI Productivity Hub · v1.3.2 · 2026-11-19**  
> Design only; no application code. Based on approved source `AI_Productivity_Hub_Spec_v1.3.2.md`.

**Authority:** Relational schema, constraints, trigger-maintained history and SQL concurrency.

**Nonnegotiable:** PK/FK `bigint` / C# `long`; native SQL Server `rowversion` / C# `byte[]`, serialized as Base64; audited table history named **`<SourceTableName>_History`**, maintained by DML triggers in the source transaction. Never use an application-managed incrementing `Version`.

**Migration ownership:** `database/triggers/` holds reviewed trigger sources; EF Core migrations are the sole controlled deployment path, including trigger installation. This is one source of truth, not two independent deployment systems. See [ARCHITECTURE.md](ARCHITECTURE.md).


## Documentation Map

- [AI_Productivity_Hub_Spec.md](AI_Productivity_Hub_Spec.md) — Product goals, features, business rules, acceptance criteria and roadmap (requirements authority).
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technology stack, Monorepo, module boundaries, deployment and CI (architecture authority).
- [DATABASE.md](DATABASE.md) — Database schema, `_History` triggers, `rowversion` and constraints (database authority).
- [API.md](API.md) — Unversioned REST `/api`, search endpoints, errors and wire contracts (REST authority).
- [MCP.md](MCP.md) — Remote MCP `/mcp`, OAuth, permissions, approvals and tool contracts (MCP authority).
- [../AGENTS.md](../AGENTS.md) — AI coding agent operating rules and required reading order.

---

## 3. SQL Server Schema — Logical Contract

### 3.1 Common Naming and Types

- Business tables plural PascalCase; PK `Id bigint IDENTITY(1,1)`; owned tables `UserId bigint`.
- FK fields `bigint` (`NULL` where optional); relational integrity checked in DB + application layer. Use composite `(UserId, Id)` unique keys / FKs where appropriate to prevent cross-user references.
- UTC events: `datetimeoffset(7)`; date-only: `date`; durations: `bigint` seconds; `Title` / `Name`: Unicode `nvarchar`; enum codes: `varchar(32)`; archive: `ArchivedAt datetimeoffset(7) NULL`.
- **Mutable business tables use `RowVersion rowversion NOT NULL`**. Map to C# `byte[]` with EF Core concurrency token. SQL Server generates/updates automatically. `rowversion` cannot be explicitly assigned, incremented, converted into time, or represented as `long Version`.
- REST/MCP `rowVersion` / `expectedRowVersion` are **Base64-encoded 8-byte values**. Decode and validate 8 bytes server-side. Compare original rowversion in the UPDATE/DELETE predicate; on zero matching rows, return concurrency conflict (HTTP `412 VERSION_CONFLICT` for REST conditional updates, unless a business-state conflict is more appropriate). Refresh client from GET.
- `RowVersion` changes for any SQL UPDATE that touches a row, even if assigned values are unchanged; this is acceptable and should be documented.
- Generic audit/history and authentication secrets have separate retention rules.

### 3.2 Core Tables

| Table | Important fields / constraints |
|---|---|
| `Users` | `Id bigint PK`, identity attributes and Identity password/lockout fields; owner seeded; no public signup. Identity security tables use Identity conventions, configured for long PKs. |
| `UserSettings` | `UserId bigint PK/FK`, Language, Theme, TimeZoneId, WeekStartsOn, DefaultAreaId, `RowVersion`. |
| `Areas` | `Id`, `UserId`, Name, SystemKey NULL, IsSystemDefault, Color, Icon, TrackingCategory, SortOrder, CreatedAt, UpdatedAt, ArchivedAt, `RowVersion`. Unique unarchived normalized name per user. |
| `Projects` | `Id`, UserId, AreaId, Name, Description, Status, Color, SortOrder, CreatedAt, UpdatedAt, ArchivedAt, `RowVersion`. |
| `Tasks` | `Id`, UserId, AreaId, ProjectId NULL, ParentTaskId NULL, Title, Description, Status, Priority, DueDate NULL, PlannedStartDate NULL, SortOrder, CompletedAt NULL, CreatedAt, UpdatedAt, ArchivedAt, `RowVersion`. |
| `TaskEstimates` | `Id`, TaskId, RevisionNumber, EstimatedSeconds > 0, Source, Reason NULL, ActorId NULL, CreatedAt. Unique (TaskId, RevisionNumber). Append-only domain rule. |
| `TimeEntries` | `Id`, UserId, AreaId, TaskId NULL, StartAt, EndAt NULL, Source, Note NULL, CreatedAt, UpdatedAt, ArchivedAt, `RowVersion`. EndAt > StartAt when present; filtered unique `(UserId)` where EndAt NULL and ArchivedAt NULL. |
| `TaskActivities` | `Id`, UserId, TaskId, ActivityType, Content NULL, ActorType, ActorId NULL, CreatedAt. User-facing journal (not full DB row history). |
| `Tags` | `Id`, UserId, Name, Color, CreatedAt, ArchivedAt, `RowVersion`. |
| `TaskTags` | `TaskId`, `TagId`, composite PK; both in same User scope. |
| `AuditEvents` | `Id`, UserId, ActorType, ActorId NULL, Action, EntityType, EntityId NULL, BeforeJson NULL, AfterJson NULL, CorrelationId, OccurredAt. Sensitive fields scrubbed. |
| `OperationApprovals` | `Id`, UserId, RequestedBy, OperationType, PayloadJson, PayloadHash, Status, ExpiresAt, ApprovedAt NULL, ExecutedAt NULL, CorrelationId, `RowVersion`. |
| `IdempotencyRecords` | `Id`, UserId, ClientIdentity, IdempotencyKey, RequestHash, Operation, ResultCode, ResponseReference, ExpiresAt; unique User+Client+Key. |
| `ApiCredentials` | `Id`, UserId, Name, TokenHash, CreatedAt, ExpiresAt, RevokedAt NULL, LastUsedAt NULL. For owned scripts, not a replacement for remote MCP OAuth. |
| `OAuthClients` / `OAuthAuthorizations` / `OAuthTokens` | OAuth server implementation-specific schema with protocol-appropriate secure opaque public identifiers. Raw token values/credentials must not be written to generic history. |
| `CredentialAreaGrants` | Credential/authorization-to-Area + permission grant, enforce Area ownership. |
| `Reviews` (P1) | `Id`, UserId, StartDate, EndDate, ReviewType, Source, Content, CreatedAt; suggestions, not source-of-truth facts. |

### 3.3 Indexes

- `Tasks(UserId, AreaId, Status)`, `(UserId, ProjectId, Status)`, `(UserId, ParentTaskId)`, `(UserId, DueDate)`, `(UserId, ArchivedAt)`.
- `TaskEstimates` unique `(TaskId, RevisionNumber)`.
- `TimeEntries(UserId, StartAt)`, `(UserId, AreaId, StartAt)`, `(UserId, TaskId, StartAt)`.
- **Filtered unique `TimeEntries(UserId)` for `EndAt IS NULL AND ArchivedAt IS NULL`.**
- `AuditEvents(UserId, OccurredAt)`; `IdempotencyRecords` unique `(UserId, ClientIdentity, IdempotencyKey)`.
- Search filters use standard indexes; full-text is optional ([API.md §8](API.md#8-search)).

---
## 4. Table History — DML Triggers (P0)

**Naming convention (mandatory):** `<SourceTableName>_History`, e.g. `Tasks_History`. Apply this consistently to SQL Server migrations, triggers, EF Core mappings, documentation, and tests.

### 4.1 Purpose and Scope

Implement **a dedicated history table per audited mutable business table** (for example `Tasks_History`, `Projects_History`, `Areas_History`, `TimeEntries_History`, `UserSettings_History`, `Tags_History`, `OperationApprovals_History`). History records snapshots of business data automatically at the SQL Server level, even when mutations do not come through EF Core.

**Mandatory minimum**: `Areas`, `Projects`, `Tasks`, `TimeEntries`, `UserSettings`, `Tags`, `OperationApprovals`. Also apply to other mutable non-secret business tables added later unless explicitly excepted in an ADR. For `TaskEstimates`, which is append-only, revisions are already historical; optionally record INSERT to `TaskEstimates_History` if uniform traceability is required, but never allow silent changes to estimates. `TaskActivities`, `AuditEvents`, and history tables themselves are append-only and **must not recursively create their own history**.

**Excluded from generic full-row snapshots**: Password hashes, Identity authenticator secrets, Recovery Codes, OAuth tokens, API token hashes, private keys and other credential-bearing tables. Record their security actions in a *sanitized*, permission-restricted security audit trail; do not duplicate secrets into history tables.

### 4.2 History Table Shape

For each audited source table `<Entity>`, create a history table named **`<Entity>_History`** (exact source table name followed by `_History`, with underscore). Example: `Tasks` → `Tasks_History`. Do not use `TasksHistory` or a `HistoryTasks` prefix. The history table contains:

| Field | SQL type | Purpose |
|---|---|---|
| `HistoryId` | `bigint IDENTITY` | Immutable history entry PK |
| `EntityId` | `bigint` | Original source row ID, **not cascade-deleted** |
| `Operation` | `char(1)` | `I`, `U`, `D` |
| `ChangedAt` | `datetimeoffset(7)` | UTC DB-generated recorded time |
| `ChangedByUserId` | `bigint NULL` | App-provided, server-verified actor when available |
| `ActorType` | `varchar(32) NULL` | User / ApiClient / McpClient / System / Unknown |
| `CorrelationId` | `nvarchar(100) NULL` | Request/operation trace ID |
| `SourceRowVersion` | `binary(8)` | Copied SQL Server rowversion of captured source snapshot |
| `...source data columns...` | same logical types | Immutable full-row snapshot of approved non-secret business columns |

Source `RowVersion` is **copied** as `SourceRowVersion binary(8)`, never declared `rowversion` in a history table (which would generate a different value). Do not use `HistoryId` as the source entity's current Version.

For UPDATE, store the **new/after-image** snapshot; for INSERT, store the inserted snapshot; for DELETE, store the **before-image** (deleted) snapshot. With INSERT records present and one snapshot per UPDATE, earlier states can be reconstructed in history order. An UPDATE also retains its exact preceding snapshot via the previous history entry. For a logical soft delete, the source row is UPDATEd and history operation remains `U` (with `ArchivedAt` set); document this in analytics. Physical DELETE records `D` and the deleted snapshot.

Use a monotonic `HistoryId` for deterministic ordering; timestamps can tie. `HistoryId` ordering is insertion order, not a guarantee of global commit order across independent transactions; don't treat it as a distributed event sequence.

**Snapshot preservation:** History tables must survive deletion of the original row. `EntityId` should generally **not** have a cascading FK to the source table. History should not be editable or deletable by application account roles. Backups and retention policies must protect it.

### 4.3 Trigger Design Contract

1. Create **set-based `AFTER INSERT, UPDATE, DELETE` triggers** (a separate trigger per action or one trigger capable of distinguishing operations) for every audited source table.
2. Triggers must process **all rows in `inserted` and `deleted`**; never assume exactly one changed row. Support `UPDATE` affecting multiple rows, batch imports and explicit SQL changes.
3. On INSERT use rows in `inserted`; on DELETE use `deleted`; on UPDATE use `inserted` for after-image. If using a combined trigger, accurately distinguish INSERT-only, UPDATE (in both), DELETE-only using primary keys.
4. The trigger and business mutation commit/roll back **in the same database transaction**. A failed history insert must fail the business mutation rather than silently lose history.
5. Use the database server's UTC time (`SYSUTCDATETIME()` converted to appropriate type); do not trust user-entered timestamps as history event time.
6. For actor metadata, the application sets **SQL Server `SESSION_CONTEXT`** values, e.g. `ActorUserId`, `ActorType`, `CorrelationId`, on the connection participating in the transaction, from authenticated server-side context. Never accept actor identity directly from a request body. Define a controlled fallback (`Unknown/System`) for authorized maintenance SQL operations.
7. **Connection-pooling safety:** prevent stale `SESSION_CONTEXT` from bleeding between requests. Establish actor context for each write transaction and clear/restore it correctly; test pooled connections. Avoid accidental trigger recursion and excessive trigger-side logic.
8. Do not update the source row inside its history trigger (to avoid extra `rowversion` increments/recursion). No external HTTP/network calls from triggers.
9. Preserve affected source row `RowVersion` in `SourceRowVersion`; SQL Server computes a new rowversion on each UPDATE. Trigger history is not the mechanism for optimistic concurrency.
10. An application login must not possess broad permissions to change or disable triggers, modify history rows, or truncate history tables.
11. EF Core migrations must create/change history table and trigger **atomically alongside source schema changes**. Every source-column addition/removal/rename requires an explicit history migration decision and a regression test.
12. Use carefully bounded trigger logic and indexing to avoid slowing high-frequency Timer writes. Monitor history-table growth and trigger latency.

### 4.4 AuditEvents vs History

- **History tables**: durable database-level *row snapshots* (what data changed) created unconditionally by triggers for selected business tables.
- **AuditEvents**: business-level *action log* (who initiated what workflow, permissions/approval/AI tool/client/correlation, outcome), written by application services. A single workflow can produce multiple history entries but generally one coherent AuditEvent and associated request correlation.
- Avoid claiming History can always identify the human actor: direct SQL maintenance operations may lack app-provided actor metadata.
- Do not create duplicate audit event rows from every trigger in addition to application audit unless explicitly required; use correlation to associate them.

### 4.5 History Read / Restore

- **No public or general MCP endpoints** for editing history. History is immutable.
- Owner-only optional API `GET /api/tasks/{id}/history` and `GET /api/time-entries/{id}/history` (P1 if deferred); returned snapshots exclude secrets and are paginated.
- Restore is an **explicit authorized business operation**, not an UPDATE on a History row. Restoring creates a **new source-table UPDATE** (thus a new `RowVersion` and new history entry), revalidates current referential integrity, overlapping time intervals, permissions and approvals.
- History retention default: no automatic pruning of core Task/TimeEntry snapshots in v1.3.2; size and backup impacts reviewed periodically. Security log retention may be shorter and must follow separate policy.

### 4.6 History Acceptance Tests

- Single-row INSERT/UPDATE/DELETE each produce the correct history snapshot/operation.
- Bulk UPDATE of 100 tasks produces 100 correct UPDATE history entries.
- Multi-row INSERT/DELETE work correctly. Soft archive creates UPDATE history with ArchivedAt.
- `SourceRowVersion` equals the actual source snapshot rowversion for INSERT/UPDATE (and deleted version for DELETE).
- History insert error rolls back original mutation.
- Optimistic concurrency conflict produces **no committed business change or history change**.
- Timer atomic switch creates appropriate history for closed A and inserted B, both in the same transaction.
- Migrating a new audited column updates trigger/history schema consistently.
- Direct authorized maintenance SQL changes are recorded with controlled Unknown/System actor metadata.
- Secrets never appear in history or generic audit payloads.
- Attempts by app credentials to UPDATE or DELETE history are rejected.

---
