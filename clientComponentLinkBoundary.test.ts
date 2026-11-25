import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function getTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return getTsxFiles(filePath);
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".tsx") ||
      /\.(test|stories)\.tsx$/.test(entry.name)
    ) {
      return [];
    }
    return [filePath];
  });
}

describe("Client Component 边界", () => {
  it.each(["component={Link}", "theme/slotLegendLayout"])(
    "使用 %s 的 TSX 文件首行必须声明 use client",
    (marker) => {
      const invalidFiles = ["app", "src/components"]
        .flatMap(getTsxFiles)
        .filter((filePath) => {
          const source = readFileSync(filePath, "utf8");
          if (!source.includes(marker)) return false;
          const firstLine = source.split(/\r?\n/, 1)[0];
          return !/^(?:"use client"|'use client');?$/.test(firstLine);
        });

      expect(invalidFiles).toEqual([]);
    },
  );
});
