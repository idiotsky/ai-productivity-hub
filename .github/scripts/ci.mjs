import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function impact(paths) {
  // Unknown non-document paths are conservative shared inputs, including future modules.
  const shared = paths.some(
    (path) =>
      /(^|\/)(AGENTS|CLAUDE)\.md$/.test(path) ||
      /^(\.github|\.agents|\.claude)\//.test(path) ||
      /(^|\/)(contracts|dtos|schemas)\//i.test(path) ||
      /^Docs\/(AI_Productivity_Hub_Spec|ARCHITECTURE|API|MCP|DATABASE)\.md$/.test(
        path,
      ) ||
      (!path.startsWith("client/") &&
        !path.startsWith("server/") &&
        !path.endsWith(".md")),
  );
  return {
    client: shared || paths.some((path) => path.startsWith("client/")),
    server: shared || paths.some((path) => path.startsWith("server/")),
  };
}

export function changedPaths(eventName, event, cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  let base;
  let head;
  if (eventName === "pull_request") {
    base = event.pull_request.base.sha;
    head = event.pull_request.head.sha;
  } else if (eventName === "push") {
    base = event.before;
    head = event.after;
  } else {
    throw new Error(`Unsupported event: ${eventName}`);
  }
  if (![base, head].every((sha) => /^[a-f0-9]{40}$/.test(sha))) {
    throw new Error("Expected full commit SHAs");
  }
  if (eventName === "push" && base === "0".repeat(40)) return null;
  if (eventName === "pull_request") base = git("merge-base", base, head).trim();
  // Disable rename detection so both the removed and added paths affect selection.
  return git("diff", "--name-only", "-z", "--no-renames", base, head, "--")
    .split("\0")
    .filter(Boolean);
}

export function gatePasses(detection, affected, build) {
  return (
    detection === "success" &&
    ((affected === "true" && build === "success") ||
      (affected === "false" && build === "skipped"))
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === "detect") {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    const paths = changedPaths(process.env.GITHUB_EVENT_NAME, event);
    const selected =
      paths === null ? { client: true, server: true } : impact(paths);
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `client=${selected.client}\nserver=${selected.server}\n`,
    );
    console.log("Selected projects:", selected);
  } else if (process.argv[2] === "gate") {
    const { DETECTION_RESULT, AFFECTED, BUILD_RESULT } = process.env;
    console.log({
      detection: DETECTION_RESULT,
      affected: AFFECTED,
      build: BUILD_RESULT,
    });
    if (!gatePasses(DETECTION_RESULT, AFFECTED, BUILD_RESULT))
      process.exitCode = 1;
  } else {
    throw new Error("Expected detect or gate");
  }
}
