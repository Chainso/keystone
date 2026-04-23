import {
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useMemo
} from "react";

import { BaseBasicMarksPlugin, BaseBlockquotePlugin, BaseHeadingPlugin, BaseHorizontalRulePlugin } from "@platejs/basic-nodes";
import { BaseCodeBlockPlugin, BaseCodeLinePlugin } from "@platejs/code-block";
import { BaseLinkPlugin } from "@platejs/link";
import { BaseBulletedListPlugin, BaseListItemContentPlugin, BaseListItemPlugin, BaseNumberedListPlugin, BaseTodoListPlugin } from "@platejs/list-classic";
import { MarkdownPlugin } from "@platejs/markdown";
import {
  BaseTableCellHeaderPlugin,
  BaseTableCellPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin
} from "@platejs/table";
import { Plate, PlateContent, ParagraphPlugin, createPlateEditor } from "platejs/react";
import remarkGfm from "remark-gfm";

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
  BaseTablePlugin.withComponent(MarkdownTableElement),
  BaseTableRowPlugin.withComponent(MarkdownTableRowElement),
  BaseTableCellPlugin.withComponent(MarkdownTableCellElement),
  BaseTableCellHeaderPlugin.withComponent(MarkdownTableHeaderCellElement),
  MarkdownPlugin.configure({
    options: {
      remarkPlugins: [remarkGfm]
    }
  })
];

interface MarkdownTableElementProps<TAttributes> {
  attributes: TAttributes;
  children: ReactNode;
}

function MarkdownTableElement({
  attributes,
  children
}: MarkdownTableElementProps<HTMLAttributes<HTMLTableElement>>) {
  return (
    <table {...attributes}>
      <tbody>{children}</tbody>
    </table>
  );
}

function MarkdownTableRowElement({
  attributes,
  children
}: MarkdownTableElementProps<HTMLAttributes<HTMLTableRowElement>>) {
  return <tr {...attributes}>{children}</tr>;
}

function MarkdownTableCellElement({
  attributes,
  children
}: MarkdownTableElementProps<TdHTMLAttributes<HTMLTableDataCellElement>>) {
  return <td {...attributes}>{children}</td>;
}

function MarkdownTableHeaderCellElement({
  attributes,
  children
}: MarkdownTableElementProps<ThHTMLAttributes<HTMLTableHeaderCellElement>>) {
  return (
    <th {...attributes} scope="col">
      {children}
    </th>
  );
}

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
