import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("static export start script", () => {
  it("serves the exported out directory instead of running next start", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const nextConfig = fs.readFileSync("next.config.ts", "utf8");

    expect(nextConfig).toContain('output: "export"');
    expect(packageJson.scripts.start).toBe("serve out -l 3000");
    expect(packageJson.scripts.start).not.toContain("next start");
  });
});
