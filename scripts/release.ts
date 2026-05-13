/**
 * release.ts
 * Bump package version, build release artifacts, commit, tag, and push.
 *
 * Usage:
 *   bun run release patch
 *   bun run release minor
 *   bun run release major
 *   bun run release 1.2.3
 *   bun run release patch --dry-run
 *   bun run release patch --skip-checks
 */

import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const PACKAGE_JSON = join(ROOT, "package.json");

type VersionBump = "patch" | "minor" | "major" | "prerelease";

interface Options {
  bump: VersionBump | string;
  dryRun: boolean;
  skipChecks: boolean;
  remote: string;
}

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

function printHelp(): void {
  console.log(`Usage: bun run release <patch|minor|major|prerelease|version> [options]

Options:
  --dry-run       Print the steps without changing files or running git mutations.
  --skip-checks   Skip bun run check before building.
  --remote <name> Git remote to push to. Defaults to origin.
  -h, --help      Show this help.`);
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    bump: "",
    dryRun: false,
    skipChecks: false,
    remote: "origin",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-checks") {
      options.skipChecks = true;
    } else if (arg === "--remote") {
      options.remote = args[++i] ?? "";
    } else if (arg.startsWith("--remote=")) {
      options.remote = arg.slice("--remote=".length);
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (!options.bump) {
      options.bump = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.bump) {
    throw new Error(
      "Missing version bump. Use patch, minor, major, prerelease, or an explicit version.",
    );
  }
  if (!options.remote) {
    throw new Error("Missing --remote value.");
  }

  return options;
}

function run(command: string[], options: { dryRun?: boolean; capture?: boolean } = {}): string {
  const printable = command.join(" ");
  if (options.dryRun) {
    console.log(`[dry-run] ${printable}`);
    return "";
  }

  console.log(`$ ${printable}`);
  const result = Bun.spawnSync(command, {
    cwd: ROOT,
    stdout: options.capture ? "pipe" : "inherit",
    stderr: "inherit",
  });

  if (!result.success) {
    throw new Error(`Command failed: ${printable}`);
  }

  return options.capture ? new TextDecoder().decode(result.stdout).trim() : "";
}

function parseVersion(version: string): [number, number, number, string | undefined] {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4]];
}

function resolveVersion(current: string, bump: string): string {
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(bump)) {
    parseVersion(bump);
    return bump;
  }

  const [major, minor, patch, prerelease] = parseVersion(current);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "prerelease": {
      const nextPrerelease = prerelease?.match(/^(.+)\.(\d+)$/);
      if (nextPrerelease) {
        return `${major}.${minor}.${patch}-${nextPrerelease[1]}.${Number(nextPrerelease[2]) + 1}`;
      }
      return `${major}.${minor}.${patch}-rc.0`;
    }
    default:
      throw new Error(`Unknown version bump: ${bump}`);
  }
}

async function readPackageJson(): Promise<PackageJson> {
  return (await Bun.file(PACKAGE_JSON).json()) as PackageJson;
}

async function writePackageJson(pkg: PackageJson, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] update package.json version to ${pkg.version}`);
    return;
  }
  await Bun.write(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);
}

function ensureTagAvailable(tag: string, remoteName: string, dryRun: boolean): void {
  if (dryRun) return;

  const local = Bun.spawnSync(["git", "rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (local.success) {
    throw new Error(`Tag already exists locally: ${tag}`);
  }

  const remote = Bun.spawnSync(["git", "ls-remote", "--exit-code", "--tags", remoteName, tag], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (remote.success) {
    throw new Error(`Tag already exists on ${remoteName}: ${tag}`);
  }
}

const options = parseArgs(Bun.argv.slice(2));
const pkg = await readPackageJson();
const currentVersion = pkg.version;
const nextVersion = resolveVersion(currentVersion, options.bump);
const tag = `v${nextVersion}`;

if (nextVersion === currentVersion) {
  throw new Error(`Version is already ${nextVersion}.`);
}

console.log(`release: ${currentVersion} -> ${nextVersion}`);

ensureTagAvailable(tag, options.remote, options.dryRun);

pkg.version = nextVersion;
await writePackageJson(pkg, options.dryRun);

if (!options.skipChecks) {
  run(["bun", "run", "check"], { dryRun: options.dryRun });
}
run(["bun", "run", "build"], { dryRun: options.dryRun });
run(["git", "add", "."], { dryRun: options.dryRun });
run(["git", "commit", "-m", `chore: release ${tag}`], { dryRun: options.dryRun });
run(["git", "tag", "-a", tag, "-m", tag], { dryRun: options.dryRun });
run(["git", "push", options.remote, "HEAD"], { dryRun: options.dryRun });
run(["git", "push", options.remote, tag], { dryRun: options.dryRun });

console.log(`released ${tag}`);
