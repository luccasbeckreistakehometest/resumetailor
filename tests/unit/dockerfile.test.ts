import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");

/** Everything the build stage copies: `COPY a b c ./` and `COPY dir ./dir` lines, not `--from=` ones. */
const copied = new Set(
  dockerfile.split("\n").filter((l) => /^COPY\s/.test(l) && !l.includes("--from="))
    .flatMap((l) => l.replace(/^COPY\s+/, "").trim().split(/\s+/).slice(0, -1)),
);

describe("Dockerfile build stage", () => {
  it("copies every root-level file Next.js picks up by convention", () => {
    const conventions = ["instrumentation.ts", "proxy.ts", "middleware.ts", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "package.json", "package-lock.json"];
    for (const f of conventions.filter((c) => fs.existsSync(path.join(root, c)))) expect(copied, f).toContain(f);
  });

  it("copies every source directory the app imports from", () => {
    const tsconfig = fs.readFileSync(path.join(root, "tsconfig.json"), "utf8");
    expect(tsconfig).toContain('"@/*": ["./*"]');
    const imported = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|css)$/.test(e.name)) for (const m of fs.readFileSync(p, "utf8").matchAll(/from "@\/([^/"]+)/g)) imported.add(m[1]);
      }
    };
    for (const d of ["app", "components", "lib"]) walk(path.join(root, d));
    for (const top of [...imported, "app", "public"]) expect(copied, top).toContain(top);
  });

  it("never copies the whole context (that would bake the server's .env into a layer)", () => {
    expect(dockerfile).not.toMatch(/^COPY\s+\.\s+\./m);
    expect(copied.has(".env")).toBe(false);
  });
});
