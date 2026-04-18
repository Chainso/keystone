// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

describe("Phase 1 app shell", () => {
  it("redirects the default route to Runs inside the global shell", async () => {
    renderRoute("/");

    await screen.findByRole("heading", { name: "Runs" });

    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Runs/i })).toHaveClass("is-active");
    expect(screen.getByText("Phase 1 scaffold")).toBeInTheDocument();
  });

  it.each([
    {
      path: "/documentation",
      heading: "Documentation"
    },
    {
      path: "/workstreams",
      heading: "Workstreams"
    },
    {
      path: "/projects/new",
      heading: "New project"
    },
    {
      path: "/settings",
      heading: "Project settings"
    }
  ])("mounts the $heading scaffold route inside the shared shell", async ({ path, heading }) => {
    renderRoute(path);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Keystone Cloudflare")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
  });
});
