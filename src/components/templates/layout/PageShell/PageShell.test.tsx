import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import { designTokens } from "theme/designTokens";
import { theme } from "theme/theme";

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

  it("页面宽度和安全区间距使用设计 token 与 Theme", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageShell footer={<button>车进来</button>} title="途泊属">
          内容
        </PageShell>
      </ThemeProvider>,
    );

    expect(screen.getByRole("banner")).toHaveStyle({
      paddingTop: `calc(${theme.spacing(2)} + env(safe-area-inset-top, 0px))`,
    });
    expect(screen.getByRole("contentinfo")).toHaveStyle({
      paddingBottom: `calc(${theme.spacing(2)} + env(safe-area-inset-bottom, 0px))`,
    });
    expect(screen.getByRole("main")).toHaveStyle({
      paddingBottom: `calc(${theme.spacing(4)} + env(safe-area-inset-bottom, 0px))`,
    });
    expect(screen.getByRole("main").parentElement).toHaveStyle({
      maxWidth: `${designTokens.size.contentMaxWidth}px`,
    });
  });

  it("支持首页标题右侧的设置入口", () => {
    render(
      <PageShell
        title="途泊属"
        headerAction={
          <a href="/settings" aria-label="设置">
            ⚙
          </a>
        }
      >
        内容
      </PageShell>,
    );
    expect(screen.getByRole("link", { name: "设置" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("传入 backHref 时仅在页面底部显示返回链接", () => {
    render(
      <PageShell title="收费设置" backHref="/settings">
        内容
      </PageShell>,
    );
    const link = screen.getByRole("link", { name: "返回" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("contentinfo")).toContainElement(link);
    expect(screen.getByRole("banner").querySelector("a")).toBeNull();
  });

  it("没有底部操作和返回地址时不渲染底部区域", () => {
    render(<PageShell title="途泊属">内容</PageShell>);

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
