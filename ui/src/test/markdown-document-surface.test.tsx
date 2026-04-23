// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const malformedMarkdownSentinel = "<Component";

vi.mock("@platejs/markdown", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@platejs/markdown")>();

  return {
    ...actual,
    deserializeMd: (...args: Parameters<typeof actual.deserializeMd>) => {
      const [, markdown] = args;

      if (markdown.includes(malformedMarkdownSentinel)) {
        throw new Error("Malformed markdown");
      }

      return actual.deserializeMd(...args);
    }
  };
});

import {
  MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID,
  MarkdownDocumentEditor,
  MarkdownDocumentViewer
} from "../components/editor/markdown-document-surface";

afterEach(() => {
  cleanup();
});

describe("MarkdownDocumentSurface", () => {
  it("renders fenced code blocks through the shared viewer surface", () => {
    render(
      <MarkdownDocumentViewer
        label="Shared document"
        markdown={'# Surface\n\n```ts\nconst stage = "execution";\n```'}
      />
    );

    const region = screen.getByRole("region", { name: "Shared document" });
    const codeBlock = region.querySelector("pre");

    expect(screen.getByRole("heading", { name: "Surface" })).toBeInTheDocument();
    expect(region).not.toHaveAttribute("data-parse-error");
    expect(codeBlock).not.toBeNull();
    expect(codeBlock).toHaveTextContent('const stage = "execution";');
    expect(codeBlock?.querySelector("code")).not.toBeNull();
  });

  it("fails closed in the viewer when markdown deserialization rejects malformed input", () => {
    const malformedMarkdown = "# Broken surface\n\n<Component";

    render(<MarkdownDocumentViewer label="Shared document" markdown={malformedMarkdown} />);

    const region = screen.getByRole("region", { name: "Shared document" });

    expect(region).toHaveAttribute("data-parse-error", "true");
    expect(
      screen.getByText(
        /This document uses markdown the workspace cannot safely render yet\.\s+The original source is shown below unchanged\./
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((_content, node) => node?.tagName === "PRE" && node.textContent === malformedMarkdown)
    ).toBeInTheDocument();
  });

  it("fails closed in the editor when markdown deserialization rejects malformed input", () => {
    const malformedMarkdown = "# Broken surface\n\n<Component";
    const onMarkdownChange = vi.fn();

    render(
      <MarkdownDocumentEditor
        editorLabel="Shared document editor"
        label="Shared document"
        markdown={malformedMarkdown}
        markdownSourceKey="broken-surface"
        onMarkdownChange={onMarkdownChange}
      />
    );

    const sourceInput = screen.getByTestId(
      MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID
    ) as HTMLTextAreaElement;

    expect(screen.getByRole("region", { name: "Shared document" })).toBeInTheDocument();
    expect(sourceInput).toBeDisabled();
    expect(sourceInput).toHaveValue(malformedMarkdown);
    expect(
      screen.getByText(
        /This document uses markdown the editor cannot safely round-trip yet\.\s+Body editing is disabled until the source is simplified\./
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((_content, node) => node?.tagName === "PRE" && node.textContent === malformedMarkdown)
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Shared document editor" })).not.toBeInTheDocument();
    expect(onMarkdownChange).not.toHaveBeenCalled();
  });
});
