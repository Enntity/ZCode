import assert from "node:assert/strict";
import test from "node:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveDefaultSkillRoots } from "../skills/roots.js";
import { resolveDefaultCustomCommandRoots } from "../commands/roots.js";
import { getDefaultSessionDbPath } from "./session-store/paths.js";
import { getDefaultLogDir } from "../logging/index.js";
import { getDefaultConfigPath } from "../config/file-config.adapter.js";

test("CLI defaults keep personal config, logs, and session data under the fork root", () => {
  const root = join(homedir(), ".enntity-zcode");
  assert.equal(getDefaultConfigPath(), join(root, "cli", "config.json"));
  assert.equal(getDefaultSessionDbPath(), join(root, "cli", "db", "db.sqlite"));
  assert.equal(getDefaultLogDir(), join(root, "cli", "log"));
});

test("user skill and command defaults are isolated while workspace .zcode remains compatible", async () => {
  const homeDirectory = join(homedir(), "enntity-root-test-home");
  const workspace = join(homedir(), "enntity-root-test-project");
  const skills = await resolveDefaultSkillRoots(workspace, { homeDirectory });
  const commands = await resolveDefaultCustomCommandRoots(workspace, { homeDirectory });
  assert.ok(skills.some((root) => root.path === join(homeDirectory, ".enntity-zcode", "skills")));
  assert.ok(skills.some((root) => root.path === join(workspace, ".zcode", "skills")));
  assert.ok(commands.some((root) => root.path === join(homeDirectory, ".enntity-zcode", "commands")));
  assert.ok(commands.some((root) => root.path === join(workspace, ".zcode", "commands")));
});
