import fs from "node:fs";
import path from "node:path";

/** The database is wiped by scripts/e2e-server.sh before the server starts; only the payment mocks' folder is ensured here. */
export default async function globalSetup() {
  fs.mkdirSync(path.join(process.cwd(), "data", "e2e", "mp"), { recursive: true });
}
