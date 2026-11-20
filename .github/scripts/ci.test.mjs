import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { impact, changedPaths, gatePasses } from "./ci.mjs";

test("project paths stay independent; shared contracts/tooling run both", () => {
  assert.deepEqual(impact(["client/src/app.ts"]), {
    client: true,
    server: false,
  });
  assert.deepEqual(impact(["server/src/Api.cs"]), {
    client: false,
    server: true,
  });
  for (const path of [
    ".github/workflows/client.yml",
    "AGENTS.md",
    "client/AGENTS.md",
    ".agents/skills/example/SKILL.md",
    ".github/README.md",
    "server/src/Contracts/Task.cs",
    "client/src/dtos/task.ts",
    "package-lock.json",
    ".gitattributes",
    "Docs/API.md",
    "Docs/MCP.md",
    "Docs/DATABASE.md",
    "Docs/ARCHITECTURE.md",
    "Docs/AI_Productivity_Hub_Spec.md",
    "database/migration.sql",
    "deploy/nginx.conf",
  ]) {
    assert.deepEqual(impact([path]), { client: true, server: true }, path);
  }
  assert.deepEqual(impact(["README.md", "Docs/Foundation-CI-Plan.md"]), {
    client: false,
    server: false,
  });
});

test("final gate accepts only successful detection plus the intended build result", () => {
  const allowed = new Set(["success|true|success", "success|false|skipped"]);
  for (const detection of ["success", "failure", "cancelled", "skipped", ""]) {
    for (const affected of ["true", "false", ""]) {
      for (const build of ["success", "failure", "cancelled", "skipped", ""]) {
        assert.equal(
          gatePasses(detection, affected, build),
          allowed.has(`${detection}|${affected}|${build}`),
        );
      }
    }
  }
});

test("Git ranges cover full pushes, PR merge bases, deletes and cross-project renames", () => {
  const cwd = mkdtempSync(join(tmpdir(), "hub-ci-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const save = (path, text) => {
    mkdirSync(join(cwd, path, ".."), { recursive: true });
    writeFileSync(join(cwd, path), text);
  };
  const commit = () => {
    git("add", ".");
    git("commit", "-qm", "fixture");
    return git("rev-parse", "HEAD");
  };
  git("init", "-q");
  git("config", "user.name", "CI test");
  git("config", "user.email", "ci@example.invalid");
  save("client/old.txt", "old");
  save("server/deleted.txt", "delete");
  const base = commit();
  git("checkout", "-qb", "feature");
  git("mv", "client/old.txt", "server/renamed.txt");
  commit();
  git("rm", "server/deleted.txt");
  save("README.md", "docs");
  const head = commit();
  const paths = changedPaths("push", { before: base, after: head }, cwd);
  assert.deepEqual(
    new Set(paths),
    new Set([
      "client/old.txt",
      "server/renamed.txt",
      "server/deleted.txt",
      "README.md",
    ]),
  );
  assert.deepEqual(impact(paths), { client: true, server: true });
  git("checkout", "--detach", base);
  save("client/base-only.txt", "base advanced");
  const advancedBase = commit();
  assert.deepEqual(
    new Set(
      changedPaths(
        "pull_request",
        {
          pull_request: { base: { sha: advancedBase }, head: { sha: head } },
        },
        cwd,
      ),
    ),
    new Set(paths),
  );
  assert.equal(
    changedPaths("push", { before: "0".repeat(40), after: head }, cwd),
    null,
  );
  assert.throws(() =>
    changedPaths("push", { before: "f".repeat(40), after: head }, cwd),
  );
  assert.throws(() => changedPaths("workflow_run", {}, cwd));
  assert.throws(() =>
    changedPaths("push", { before: "--bad", after: head }, cwd),
  );
});

test("CLI fails closed and emits explicit selection outputs", () => {
  const cwd = mkdtempSync(join(tmpdir(), "hub-ci-cli-"));
  const eventPath = join(cwd, "event.json");
  const output = join(cwd, "output");
  writeFileSync(
    eventPath,
    JSON.stringify({ before: "0".repeat(40), after: "a".repeat(40) }),
  );
  const script = fileURLToPath(new URL("./ci.mjs", import.meta.url));
  const run = (mode, env) =>
    spawnSync(process.execPath, [script, mode], {
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
  assert.equal(
    run("detect", {
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: output,
    }).status,
    0,
  );
  assert.equal(readFileSync(output, "utf8"), "client=true\nserver=true\n");
  assert.equal(
    run("detect", {
      GITHUB_EVENT_NAME: "workflow_run",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: output,
    }).status,
    1,
  );
  assert.equal(readFileSync(output, "utf8"), "client=true\nserver=true\n");
  assert.equal(
    run("gate", {
      DETECTION_RESULT: "failure",
      AFFECTED: "false",
      BUILD_RESULT: "skipped",
    }).status,
    1,
  );
  assert.equal(
    run("gate", {
      DETECTION_RESULT: "success",
      AFFECTED: "false",
      BUILD_RESULT: "skipped",
    }).status,
    0,
  );
});
