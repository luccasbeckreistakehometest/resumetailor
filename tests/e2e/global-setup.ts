import fs from "node:fs";
import path from "node:path";
export default async function globalSetup() {
  // With E2E_REUSE=1 the server is already running on this database; the caller wiped it before starting it.
  if (process.env.E2E_REUSE === "1") return;
  fs.rmSync(path.join(process.cwd(), "data", "e2e"), { recursive: true, force: true });
}
