// @vitest-environment node

import { describe, expect, it } from "vitest";

import * as healthRoutes from "internal/health/router";
import { internalModules } from "internal/moduleRegistry";
import { apiRouter } from "internal/router";

type RouteContract = {
  method: string;
  path: string;
};

type RouteNamespace = Record<string, unknown>;

type RouteSpec = {
  basePath: string;
  expectedRoutes: Record<string, RouteContract>;
  moduleName: string;
  namespace: RouteNamespace;
};

const routeSpecs: RouteSpec[] = [
  {
    basePath: "/health",
    expectedRoutes: {
      getHealthRoute: { method: "get", path: "/" },
    },
    moduleName: "health",
    namespace: healthRoutes,
  },
];

const httpMethods = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

function extractRouteContracts(
  namespace: RouteNamespace,
): Record<string, RouteContract> {
  return Object.fromEntries(
    Object.entries(namespace)
      .filter(([name]) => name.endsWith("Route"))
      .map(([name, value]) => {
        expect(value, name).toBeTypeOf("object");
        const route = value as Partial<RouteContract>;
        expect(route.method, `${name}.method`).toBeTypeOf("string");
        expect(route.path, `${name}.path`).toBeTypeOf("string");
        return [name, { method: route.method, path: route.path }];
      }),
  ) as Record<string, RouteContract>;
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/{2,}/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function toRouteKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

describe("internal route registry", () => {
  it("Module Registry 保持既有模块顺序与 basePath", () => {
    expect(
      internalModules.map(({ basePath, name }) => ({ basePath, name })),
    ).toEqual([{ basePath: "/health", name: "health" }]);
  });

  it("所有 Route Contract 保持既有 Method 与相对 Path", () => {
    for (const { expectedRoutes, moduleName, namespace } of routeSpecs) {
      expect(extractRouteContracts(namespace), moduleName).toEqual(
        expectedRoutes,
      );
    }
  });

  it("OpenAPI 文档保持最终 Method 与完整 URL", () => {
    const document = apiRouter.getOpenAPIDocument({
      info: { title: "BurrowPark API", version: "test" },
      openapi: "3.0.0",
    });
    const actualRoutes = Object.entries(document.paths ?? {})
      .flatMap(([path, pathItem]) =>
        Object.keys(pathItem ?? {})
          .filter((method) => httpMethods.has(method))
          .map((method) => toRouteKey(method, path)),
      )
      .sort();
    const expectedRoutes = routeSpecs
      .flatMap(({ basePath, expectedRoutes }) =>
        Object.values(expectedRoutes).map(({ method, path }) =>
          toRouteKey(method, `/api${basePath}${path}`),
        ),
      )
      .sort();

    expect(actualRoutes).toEqual(expectedRoutes);
  });
});
