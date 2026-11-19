# Server

Minimal ASP.NET Core 11 host for E01 Foundation. Requires .NET SDK 11.0.100
or a later patch in the same feature band.

From this directory:

```powershell
dotnet restore AIProductivityHub.slnx
dotnet build AIProductivityHub.slnx --configuration Release --no-restore
dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore
dotnet run --project src/AIProductivityHub.Api
```

The development profile listens on `http://localhost:5000`. Stop with Ctrl+C.
No endpoints are mapped: requests to `/`, `/api` and `/mcp` return HTTP 404.
The host uses the framework's default configuration and console logging.
This is a local scaffold, not a deployment configuration.

Only the executable host exists. Application, Domain, Infrastructure and MCP
projects will be introduced when an implementation slice needs them, following
[Architecture §10A.2](../Docs/ARCHITECTURE.md#10a2-canonical-repository-layout).
No database, authentication, REST/MCP contracts or external packages are included.

## Verification

Scaffold acceptance: the solution restores and builds independently of the client,
passes formatting/analyzer checks, and Kestrel starts and returns HTTP 404 for
unmapped routes. No application unit tests exist yet; validate startup with a real
HTTP request after running the host.

Verified on Windows with SDK 11.0.100 on 2026-11-19:

- Restore: passed.
- Release build with `-warnaserror`: passed, zero warnings and errors.
- `dotnet format --verify-no-changes --no-restore`: passed.
- Real Kestrel HTTP smoke check: `/`, `/api` and `/mcp` each returned 404;
  the test process was stopped afterward.
- Format and HTTP checks required execution outside the sandbox because of local
  named-pipe and loopback-socket restrictions.

Next proposed slice: define and implement the minimal health-check contract.
