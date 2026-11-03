import { homedir } from "node:os";
import { join } from "node:path";

export function getDefaultSessionDbPath(): string {
  return join(homedir(), ".enntity-zcode", "cli", "db", "db.sqlite");
}
