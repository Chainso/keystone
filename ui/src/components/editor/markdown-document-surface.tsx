'use client';

import * as React from 'react';

import { deserializeMd, serializeMd } from '@platejs/markdown';
import type { Value } from 'platejs';
import { Plate, createPlateEditor, usePlateEditor } from 'platejs/react';
import { createStaticEditor } from 'platejs/static';

import { cn } from '@/lib/utils';
import { normalizeMarkdownSourceBody } from '@/shared/markdown/source-markdown';

import { BaseBasicBlocksKit } from './plugins/basic-blocks-base-kit';
import { BaseBasicMarksKit } from './plugins/basic-marks-base-kit';
import { BasicNodesKit } from './plugins/basic-nodes-kit';
import { BaseCodeBlockKit } from './plugins/code-block-base-kit';
import { CodeBlockKit } from './plugins/code-block-kit';
import { BaseLinkKit } from './plugins/link-base-kit';
import { LinkKit } from './plugins/link-kit';
import { BaseListKit } from './plugins/list-classic-base-kit';
import { ListKit } from './plugins/list-classic-kit';
import { MarkdownKit } from './plugins/markdown-kit';
import { BaseMathKit } from './plugins/math-base-kit';
import { MathKit } from './plugins/math-kit';
import { BaseTableKit } from './plugins/table-base-kit';
import { TableKit } from './plugins/table-kit';
import { Editor, EditorContainer } from '../ui/editor';
import { EditorStatic } from '../ui/editor-static';

const markdownEditorPlugins = [
  ...BasicNodesKit,
  ...CodeBlockKit,
  ...LinkKit,
  ...ListKit,
  ...MathKit,
  ...TableKit,
  ...MarkdownKit,
];

const markdownStaticPlugins = [
  ...BaseBasicBlocksKit,
  ...BaseBasicMarksKit,
  ...BaseCodeBlockKit,
  ...BaseLinkKit,
  ...BaseListKit,
  ...BaseMathKit,
  ...BaseTableKit,
  ...MarkdownKit,
];

function buildFallbackDocumentValue(markdown: string): Value {
  return [
    {
      type: 'p',
      children: [
        {
          text: markdown,
        },
      ],
    },
  ];
}

function parseMarkdownSource(
  editor: Parameters<typeof deserializeMd>[0],
  markdown: string
): Value {
  if (markdown.trim().length === 0) {
    return buildFallbackDocumentValue('');
  }

  try {
    return deserializeMd(editor, markdown);
  } catch {
    return buildFallbackDocumentValue(markdown);
  }
}

function serializeMarkdownSource(
  editor: Parameters<typeof serializeMd>[0],
  value: Value
) {
  return normalizeMarkdownSourceBody(
    serializeMd(editor, {
      value,
    })
  );
}

function createStaticMarkdownViewer(markdown: string) {
  const editor = createStaticEditor({
    plugins: markdownStaticPlugins,
  });

  return {
    editor,
    value: parseMarkdownSource(editor, markdown),
  };
}

export interface MarkdownDocumentViewerProps {
  className?: string;
  emptyMessage?: string;
  label: string;
  markdown: string;
}

export function MarkdownDocumentViewer({
  className,
  emptyMessage = 'This document is empty.',
  label,
  markdown,
}: MarkdownDocumentViewerProps) {
  const viewer = React.useMemo(() => {
    if (markdown.trim().length === 0) {
      return null;
    }

    return createStaticMarkdownViewer(markdown);
  }, [markdown]);

  if (!viewer) {
    return (
      <section
        role="region"
        aria-label={label}
        className={cn('markdown-document-surface', className)}
        data-empty="true"
      >
        <p className="markdown-document-surface-empty">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label={label}
      className={cn('markdown-document-surface', className)}
    >
      <div className="markdown-document-surface-shell">
        <EditorStatic
          className="markdown-document-surface-content"
          editor={viewer.editor}
          value={viewer.value}
          variant="workspaceDocument"
        />
      </div>
    </section>
  );
}

export interface MarkdownDocumentEditorProps {
  className?: string;
  editorLabel?: string;
  label: string;
  markdown: string;
  markdownSourceKey: string;
  onMarkdownChange: (markdown: string) => void;
  placeholder?: string;
}

export function MarkdownDocumentEditor({
  className,
  editorLabel = 'Document editor',
  label,
  markdown,
  markdownSourceKey,
  onMarkdownChange,
  placeholder = 'Write the current document.',
}: MarkdownDocumentEditorProps) {
  const initialValue = React.useMemo(() => {
    const editor = createPlateEditor({
      plugins: markdownEditorPlugins,
    });

    return parseMarkdownSource(editor, markdown);
  }, [markdownSourceKey]);

  const editor = usePlateEditor(
    {
      plugins: markdownEditorPlugins,
      value: initialValue,
    },
    [markdownSourceKey]
  );

  return (
    <section
      role="region"
      aria-label={label}
      className={cn('markdown-document-surface', className)}
    >
      <Plate
        editor={editor}
        onValueChange={({ editor: currentEditor, value }) => {
          onMarkdownChange(serializeMarkdownSource(currentEditor, value));
        }}
      >
        <EditorContainer
          className="markdown-document-surface-shell"
          variant="workspaceDocument"
        >
          <Editor
            aria-label={editorLabel}
            aria-multiline="true"
            className="markdown-document-surface-content markdown-document-editor-content"
            placeholder={placeholder}
            role="textbox"
            variant="workspaceDocument"
          />
        </EditorContainer>
      </Plate>
    </section>
  );
}
