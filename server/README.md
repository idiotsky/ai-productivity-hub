# Server

Minimal ASP.NET Core 11 host for E01 Foundation. Requires .NET SDK 11.0.100 or a later patch in the same feature band (`global.json`). Server restores, builds, and tests independently of Client.

From this directory:

```powershell
dotnet restore AIProductivityHub.slnx
dotnet build AIProductivityHub.slnx --configuration Release --no-restore -warnaserror
dotnet test tests/AIProductivityHub.Api.Tests/AIProductivityHub.Api.Tests.csproj --configuration Release --no-build --no-restore --settings tests.runsettings
dotnet format AIProductivityHub.slnx --verify-no-changes --no-restore
dotnet run --project src/AIProductivityHub.Api
```

`Directory.Build.props` centralizes the target framework, nullable checks, implicit usings, non-packable output, product metadata and strong-name signing for all Server projects. The language version follows the target framework default. `Key/AIProductivityHub.snk` is the shared 2048-bit strong-name key pair; preserve it to keep assembly identity stable. This key is for assembly identity only, not authentication or publisher verification.

`Directory.Packages.props` centrally manages NuGet package versions. Projects keep their own `PackageReference` items without `Version`; add or update versions through `PackageVersion` items in the central file.

The shared configuration also enables SDK .NET 11 recommended analyzers and build-time code-style analysis, with warnings treated as errors. NUnit 5.0.0 with NUnit3TestAdapter 6.3.1 runs through Microsoft.NET.Test.Sdk/VSTest; `tests.runsettings` makes zero selected/discovered tests fail. Use the explicit test-project command above so an accidentally empty solution cannot produce a successful no-op test gate. Build before `--no-build`.

The development profile listens on `http://localhost:5000`. Stop with Ctrl+C. No endpoints are mapped: requests to `/`, `/api` and `/mcp` return HTTP 404. The host uses framework-default configuration and console logging. This is a local scaffold, not a deployment configuration.

Only the executable host and its host tests exist. Application, Domain, Infrastructure and MCP projects will be introduced when an implementation slice needs them, following [Architecture §10A.2](../Docs/ARCHITECTURE.md#10a2-canonical-repository-layout). No database, authentication or REST/MCP contracts are implemented.

## Verification

Verified on Windows with SDK 11.0.100 on 2026-11-19:

- Restore, Release build/analyzers, and format check passed; zero build warnings/errors.
- 3 WebApplicationFactory/TestServer cases passed: `/`, `/api`, `/mcp` each return HTTP 404 with an empty body through the existing host pipeline.
- Deliberate whitespace, invalid C#, and assertion probes failed in an isolated source copy; restored gates passed. A CA2200 analyzer violation and a zero-test filter also failed their gates.
- These are in-process host integration tests, not Kestrel/network, SQL, security, or MCP protocol E2E tests. Scaffold Kestrel smoke evidence predates this slice.
- Local restore/build/test/format commands used execution outside the sandbox for NuGet, CLI registry/cache, named-pipe and testhost permissions.

Build-configuration update verification:

- Release build passed with zero warnings/errors; all 3 host tests passed.
- Strong-name verification (`sn -vf`) passed for the API and test assemblies.
- Format verification failed on pre-existing CRLF line endings in unchanged `src/AIProductivityHub.Api/Program.cs`; that unrelated file was left unchanged.

Next proposed slice: independent path-aware Client and Server CI workflows; see [the foundation plan](../Docs/Foundation-CI-Plan.md).
