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

export const MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID =
  'markdown-document-editor-source';

const isTestMode = import.meta.env.MODE === 'test';

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

type MarkdownParseResult =
  | {
      status: 'ready';
      value: Value;
    }
  | {
      markdown: string;
      status: 'error';
    };

function parseMarkdownSource(
  editor: Parameters<typeof deserializeMd>[0],
  markdown: string
): MarkdownParseResult {
  const normalizedMarkdown = normalizeMarkdownSourceBody(markdown);

  if (normalizedMarkdown.trim().length === 0) {
    return {
      status: 'ready',
      value: buildFallbackDocumentValue(''),
    };
  }

  try {
    return {
      status: 'ready',
      value: deserializeMd(editor, normalizedMarkdown),
    };
  } catch {
    return {
      markdown,
      status: 'error',
    };
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
  const result = parseMarkdownSource(editor, markdown);

  return {
    editor,
    result,
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

  if (viewer.result.status === 'error') {
    return (
      <section
        role="region"
        aria-label={label}
        className={cn('markdown-document-surface', className)}
        data-parse-error="true"
      >
        <div className="markdown-document-surface-shell">
          <p className="form-field-error">
            This document uses markdown the workspace cannot safely render yet.
            The original source is shown below unchanged.
          </p>
          <pre className="markdown-document-surface-content whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-6">
            {viewer.result.markdown}
          </pre>
        </div>
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
          value={viewer.result.value}
          variant="workspaceDocument"
        />
      </div>
    </section>
  );
}

export interface MarkdownDocumentEditorProps {
  className?: string;
  disabled?: boolean;
  editorLabel?: string;
  label: string;
  markdown: string;
  markdownSourceKey: string;
  onMarkdownChange: (markdown: string) => void;
  placeholder?: string;
}

export function MarkdownDocumentEditor({
  className,
  disabled = false,
  editorLabel = 'Document editor',
  label,
  markdown,
  markdownSourceKey,
  onMarkdownChange,
  placeholder = 'Write the current document.',
}: MarkdownDocumentEditorProps) {
  const [editorResetNonce, setEditorResetNonce] = React.useState(0);
  const editorKey = `${markdownSourceKey}:${editorResetNonce}`;
  const initialState = React.useMemo(() => {
    const editor = createPlateEditor({
      plugins: markdownEditorPlugins,
    });

    return parseMarkdownSource(editor, markdown);
  }, [editorKey, markdown]);

  const isEditorDisabled = disabled || initialState.status === 'error';

  const editor = usePlateEditor(
    {
      plugins: markdownEditorPlugins,
      value:
        initialState.status === 'ready'
          ? initialState.value
          : buildFallbackDocumentValue(''),
    },
    [editorKey]
  );

  return (
    <section
      role="region"
      aria-label={label}
      className={cn('markdown-document-surface', className)}
    >
      {isTestMode ? (
        <textarea
          aria-hidden="true"
          className="sr-only"
          data-markdown-source-key={markdownSourceKey}
          data-testid={MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID}
          disabled={isEditorDisabled}
          tabIndex={-1}
          value={markdown}
          onChange={(event) => {
            setEditorResetNonce((current) => current + 1);
            onMarkdownChange(event.currentTarget.value);
          }}
        />
      ) : null}
      {initialState.status === 'error' ? (
        <div className="markdown-document-surface-shell" data-parse-error="true">
          <p className="form-field-error">
            This document uses markdown the editor cannot safely round-trip yet.
            Body editing is disabled until the source is simplified.
          </p>
          <pre className="markdown-document-surface-content whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-6">
            {initialState.markdown}
          </pre>
        </div>
      ) : (
      <Plate
        editor={editor}
        onValueChange={({ editor: currentEditor, value }) => {
          onMarkdownChange(serializeMarkdownSource(currentEditor, value));
        }}
      >
        <EditorContainer
          aria-disabled={isEditorDisabled || undefined}
          className="markdown-document-surface-shell"
          variant="workspaceDocument"
        >
          <Editor
            aria-disabled={isEditorDisabled || undefined}
            aria-label={editorLabel}
            aria-multiline="true"
            className="markdown-document-surface-content markdown-document-editor-content"
            disabled={isEditorDisabled}
            placeholder={placeholder}
            readOnly={isEditorDisabled}
            role="textbox"
            variant="workspaceDocument"
          />
        </EditorContainer>
      </Plate>
      )}
    </section>
  );
}
