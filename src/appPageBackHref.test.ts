// @vitest-environment node

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const appDirectory = fileURLToPath(new URL("../app/(app)/", import.meta.url));

describe("业务页面返回按钮", () => {
  it("除首页以外的所有页面均通过 PageShell 提供 backHref", () => {
    const pages = [...globSync("**/page.tsx", { cwd: appDirectory })].filter(
      (path) => path !== "page.tsx",
    );
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
          if (!hasBackHref) missing.push(path);
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
      if (!hasPageShell) missing.push(path + "（未使用 PageShell）");
    }
    expect(missing).toEqual([]);
  });
});
