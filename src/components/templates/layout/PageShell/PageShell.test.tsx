import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("以一级标题显示页面标题并渲染内容", () => {
    render(
      <PageShell title="途泊属">
        <p>车位地图</p>
      </PageShell>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "途泊属" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("车位地图");
  });

  it("传入 subtitle 与 footer 时显示", () => {
    render(
      <PageShell
        footer={<button>车进来</button>}
        subtitle="11月18日"
        title="途泊属"
      >
        内容
      </PageShell>,
    );

    expect(screen.getByText("11月18日")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toContainElement(
      screen.getByRole("button", { name: "车进来" }),
    );
  });

  it("未传 footer 时不渲染底部区域", () => {
    render(<PageShell title="途泊属">内容</PageShell>);

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
