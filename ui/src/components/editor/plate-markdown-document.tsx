import { useMemo } from "react";

import { BaseBasicMarksPlugin, BaseBlockquotePlugin, BaseHeadingPlugin, BaseHorizontalRulePlugin } from "@platejs/basic-nodes";
import { BaseCodeBlockPlugin, BaseCodeLinePlugin } from "@platejs/code-block";
import { BaseLinkPlugin } from "@platejs/link";
import { BaseBulletedListPlugin, BaseListItemContentPlugin, BaseListItemPlugin, BaseNumberedListPlugin, BaseTodoListPlugin } from "@platejs/list-classic";
import { MarkdownPlugin } from "@platejs/markdown";
import { Plate, PlateContent, ParagraphPlugin, createPlateEditor } from "platejs/react";

import { cn } from "@/lib/utils";

const plateMarkdownPlugins = [
  ParagraphPlugin,
  BaseHeadingPlugin,
  BaseBlockquotePlugin,
  BaseBasicMarksPlugin,
  BaseHorizontalRulePlugin,
  BaseBulletedListPlugin,
  BaseNumberedListPlugin,
  BaseListItemPlugin,
  BaseListItemContentPlugin,
  BaseTodoListPlugin,
  BaseCodeBlockPlugin,
  BaseCodeLinePlugin,
  BaseLinkPlugin,
  MarkdownPlugin
];

function buildFallbackDocumentValue(markdown: string) {
  return [
    {
      type: "p",
      children: [
        {
          text: markdown
        }
      ]
    }
  ];
}

function createPlateMarkdownEditor(markdown: string) {
  const editor = createPlateEditor({
    plugins: plateMarkdownPlugins
  });

  try {
    editor.children = editor.api.markdown.deserialize(markdown);
  } catch {
    editor.children = buildFallbackDocumentValue(markdown);
  }

  return editor;
}

export function canonicalizeMarkdown(markdown: string) {
  if (markdown.trim().length === 0) {
    return "";
  }

  const editor = createPlateMarkdownEditor(markdown);

  try {
    return editor.api.markdown.serialize();
  } catch {
    return markdown;
  }
}

export function PlateMarkdownDocument({
  className,
  emptyMessage = "This document is empty.",
  label,
  markdown
}: {
  className?: string;
  emptyMessage?: string;
  label: string;
  markdown: string;
}) {
  const editor = useMemo(() => {
    if (markdown.trim().length === 0) {
      return null;
    }

    return createPlateMarkdownEditor(markdown);
  }, [markdown]);

  if (!editor) {
    return (
      <section
        role="region"
        aria-label={label}
        className={cn("markdown-document-surface", className)}
        data-empty="true"
      >
        <p className="markdown-document-surface-empty">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section role="region" aria-label={label} className={cn("markdown-document-surface", className)}>
      <Plate editor={editor} readOnly>
        <PlateContent className="markdown-document-surface-content" readOnly />
      </Plate>
    </section>
  );
}
