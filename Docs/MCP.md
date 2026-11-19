# AI Productivity Hub — Remote MCP, OAuth & Security

> **AI Productivity Hub · v1.3.2 · 2026-11-19**  
> Design only; no application code. Based on approved source `AI_Productivity_Hub_Spec_v1.3.2.md`.

**Authority:** External AI access, OAuth, tool schemas, Area permissions and approval workflow. Remote MCP endpoint `/mcp`, no first-party LLM implementation.

The Browser uses user sessions, whereas external MCP clients obtain appropriately scoped OAuth tokens. Both call the same Application Services. Security-sensitive writes use Owner approval, not a client-only confirmation assumption.


## Documentation Map

- [AI_Productivity_Hub_Spec.md](AI_Productivity_Hub_Spec.md) — Product goals, features, business rules, acceptance criteria and roadmap (requirements authority).
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technology stack, Monorepo, module boundaries, deployment and CI (architecture authority).
- [DATABASE.md](DATABASE.md) — Database schema, `_History` triggers, `rowversion` and constraints (database authority).
- [API.md](API.md) — Unversioned REST `/api`, search endpoints, errors and wire contracts (REST authority).
- [MCP.md](MCP.md) — Remote MCP `/mcp`, OAuth, permissions, approvals and tool contracts (MCP authority).
- [../AGENTS.md](../AGENTS.md) — AI coding agent operating rules and required reading order.

---

## 5. Authentication / Authorization / Security

- A user must log in to access the application. One Owner account is initialized through a secure bootstrap workflow. Public signup disabled.
- ASP.NET Core Identity with `long` user keys, salted password hashing, secure session cookies `HttpOnly`, `Secure`, appropriate `SameSite`, CSRF defenses on cookie-authenticated writes, session expiration and reauthentication for sensitive settings.
- Brute-force defense: 5 consecutive failed password attempts -> suggested 15-minute lockout; IP- and account-based rate limiting in application plus Nginx edge throttling; generic login failure messages; audit events without passwords/codes. Account recovery must not be permanently denied by malicious lockout.
- Optional TOTP Authenticator 2FA, enabled after proof by valid code, with one-time hashed recovery codes; encrypted TOTP secret, secure disable/reset with recent password/second-factor verification. No SMS 2FA in MVP.
- OAuth for Remote MCP: authorization code + PKCE, protected-resource metadata, OAuth authorization server metadata discovery, correct `resource` / token audience validation, exact redirect URI checking, client identity and scope validation, revocation and refresh token protection. No bearer-token passthrough.
- Area scope and operation permission checked for **every** resource in a read/write/batch call, regardless of which client is used. Suggested scopes: `areas.read`, `projects.read`, `tasks.read`, `tasks.write`, `time.read`, `time.write`, `analytics.read`, `history.modify`, `admin`.
- Ordinary authorized AI task create/update/complete and timer operations may execute directly, subject to tool permission. Protected operations (move/archive tasks, correct/archive historical time, significant bulk changes) create an immutable server-side OperationApproval; only the recently authenticated Owner approves in the app. Revalidate business state, `rowversion` and permissions before execution. Approval expires (default 15 min), cannot be reused.
- User-generated content (task descriptions, notes) is untrusted input, not a source of new authorization or instructions.
- Use HTTPS, safe proxy headers, proper CORS/CSRF/Origin checks as relevant, request limits, structured logs, secret management and least-privilege SQL account.

---
## 7. Remote MCP Contract / OAuth

- Remote MCP exposed over HTTPS at `/mcp`, using Streamable HTTP and selected current compatible MCP protocol/SDK version; verify actual client compatibility in an early technical spike.
- OAuth authorization code + PKCE, protected-resource and authorization-server metadata, audience and scope controls, consent and revocation. External clients do not access SQL Server, nor use app session cookies as OAuth tokens.
- Tool handlers call the **same** application services as REST. Structured inputs/outputs; return durable errors/correlation IDs and exposed Base64 rowVersion when relevant.

### Tool Catalog

**Read:** `areas_list`, `projects_list`, `tasks_list`, `tasks_get`, `tasks_get_estimates`, `time_entries_list`, `timer_get_current`, `analytics_get_summary`.

**Standard write:** `tasks_create`, `tasks_create_batch`, `tasks_update`, `tasks_complete`, `tasks_add_estimate`, `timer_start`, `timer_stop`, `timer_switch`, `time_entries_create`.

**Protected write, server approval:** `tasks_move`, `tasks_archive`, `time_entries_update`, `time_entries_archive`. No tool directly edits history rows.

- `tasks_update`, `tasks_complete`, `tasks_move`, etc. that modify an existing versioned entity accept `expectedRowVersion` as Base64, not `expectedVersion: long`.
- Batch Task creation: max suggested 50, dryRun validation option, client-side temporary references for parent-child links, one transaction, idempotency, per-item authorization.
- Protect against prompt injection in Task descriptions and notes; tool calls never bypass permission, approval or business validation.

---
