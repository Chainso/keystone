import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PlateMarkdownDocument } from "../components/editor/plate-markdown-document";

describe("PlateMarkdownDocument", () => {
  it("renders markdown horizontal rules without crashing the document surface", () => {
    render(
      <PlateMarkdownDocument
        label="Document preview"
        markdown={"# Smaller Implementation Plan\n\nBefore divider\n\n---\n\nAfter divider\n"}
      />
    );

    const documentRegion = screen.getByRole("region", {
      name: "Document preview"
    });

    expect(
      within(documentRegion).getByRole("heading", {
        name: "Smaller Implementation Plan"
      })
    ).toBeInTheDocument();
    expect(within(documentRegion).getByRole("separator")).toBeInTheDocument();
    expect(within(documentRegion).getByText("After divider")).toBeInTheDocument();
  });
});
