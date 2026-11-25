// @vitest-environment node

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const appDirectory = fileURLToPath(new URL("../app/(app)/", import.meta.url));

describe("业务页面底部返回导航", () => {
  it("主导航页面使用共享布局，其余业务页面保留底部返回地址", () => {
    const navigationPages = new Set([
      join("(tabs)", "(parking)", "page.tsx"),
      join("(tabs)", "settings", "page.tsx"),
      join("(tabs)", "reminders", "page.tsx"),
    ]);
    const pages = [...globSync("**/page.tsx", { cwd: appDirectory })];
    expect(pages.length).toBeGreaterThan(0);
    const mainLayout = readFileSync(
      join(appDirectory, "(tabs)", "layout.tsx"),
      "utf8",
    );
    expect(mainLayout).toContain("<HomeNavigation />");
    for (const path of navigationPages) {
      expect(pages).toContain(path);
    }

    const modalPages = new Set([
      join("(tabs)", "(parking)", "@operation", "page.tsx"),
      join(
        "(tabs)",
        "(parking)",
        "@operation",
        "(.)slots",
        "[code]",
        "page.tsx",
      ),
    ]);
    for (const path of modalPages) expect(pages).toContain(path);

    const missing: string[] = [];
    for (const path of pages) {
      // 弹窗路由由共享 Dialog 提供返回地图入口，不再嵌套 PageShell。
      if (modalPages.has(path)) continue;
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
            const embedded = node.attributes.properties.some(
              (property) =>
                ts.isJsxAttribute(property) &&
                property.name.getText(file) === "embedded",
            );
            if (!embedded || hasHomeNavigation || hasBackHref) {
              missing.push(path);
            }
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
