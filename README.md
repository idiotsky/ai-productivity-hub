# AI Productivity Hub

A self-hosted app for personal task management, time tracking and productivity insights, with external AI access through Remote MCP and OAuth.

**Status:** Design and planning. Application code is not implemented yet.

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

Read [AGENTS.md](AGENTS.md) before making changes. Deliver one reviewable slice at a time using [continue-plan](.claude/skills/continue-plan/SKILL.md) when an implementation plan exists.

Build and setup instructions will be added with the application projects.
