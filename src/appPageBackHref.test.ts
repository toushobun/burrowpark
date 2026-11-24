// @vitest-environment node

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const appDirectory = fileURLToPath(new URL("../app/(app)/", import.meta.url));

describe("业务页面底部返回导航", () => {
  it("主导航页面使用 HomeNavigation，其余业务页面保留底部返回地址", () => {
    const navigationPages = new Set([
      "page.tsx",
      join("settings", "page.tsx"),
      join("reminders", "page.tsx"),
    ]);
    const pages = [...globSync("**/page.tsx", { cwd: appDirectory })];
    expect(pages.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const path of pages) {
      const source = readFileSync(join(appDirectory, path), "utf8");
      const file = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      let hasPageShell = false;
      const visit = (node: ts.Node) => {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          node.tagName.getText(file) === "PageShell"
        ) {
          hasPageShell = true;
          const hasBackHref = node.attributes.properties.some(
            (property) =>
              ts.isJsxAttribute(property) &&
              property.name.getText(file) === "backHref",
          );
          const hasHomeNavigation = node.attributes.properties.some(
            (property) =>
              ts.isJsxAttribute(property) &&
              property.name.getText(file) === "footer" &&
              property.initializer?.getText(file).includes("<HomeNavigation"),
          );
          if (navigationPages.has(path)) {
            if (!hasHomeNavigation) missing.push(path);
          } else if (!hasBackHref) {
            missing.push(path);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
      if (!hasPageShell) missing.push(path + "（未使用 PageShell）");
    }
    expect(missing).toEqual([]);
  });
});
