// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID } from "../components/editor/markdown-document-surface";

interface CloudflareChatMock {
  addToolApprovalResponse: ReturnType<typeof vi.fn>;
  addToolOutput: ReturnType<typeof vi.fn>;
  append: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
  clearHistory: ReturnType<typeof vi.fn>;
  data: unknown[];
  error: unknown;
  handleInputChange: ReturnType<typeof vi.fn>;
  handleSubmit: ReturnType<typeof vi.fn>;
  input: string;
  isServerStreaming: boolean;
  isStreaming: boolean;
  messages: UIMessage[];
  reload: ReturnType<typeof vi.fn>;
  resumeStream: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  setData: ReturnType<typeof vi.fn>;
  setInput: ReturnType<typeof vi.fn>;
  setMessages: ReturnType<typeof vi.fn>;
  status: "error" | "idle" | "streaming" | "submitted";
  stop: ReturnType<typeof vi.fn>;
}

function createCloudflareChatMock(overrides: Partial<CloudflareChatMock> = {}) {
  return {
    ...defaultCloudflareChatMock(),
    ...overrides
  };
}

function defaultCloudflareChatMock(): CloudflareChatMock {
  return {
    addToolApprovalResponse: vi.fn(),
    addToolOutput: vi.fn(),
    append: vi.fn(),
    clearError: vi.fn(),
    clearHistory: vi.fn(),
    data: [],
    error: undefined,
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    input: "",
    isServerStreaming: false,
    isStreaming: false,
    messages: [] as UIMessage[],
    reload: vi.fn(),
    resumeStream: vi.fn(),
    sendMessage: vi.fn(),
    setData: vi.fn(),
    setInput: vi.fn(),
    setMessages: vi.fn(),
    status: "idle",
    stop: vi.fn()
  };
}

function createConversationMessage(
  id: string,
  role: UIMessage["role"],
  parts: UIMessage["parts"]
): UIMessage {
  return {
    id,
    parts,
    role
  };
}

function createAssistantTranscriptMessages(): UIMessage[] {
  return [
    createConversationMessage("planning-user-1", "user", [
      {
        text: "Summarize the current planning state.",
        type: "text"
      }
    ]),
    createConversationMessage("planning-assistant-1", "assistant", [
      {
        text: "### Transcript summary\n- Keep Cloudflare as the conversation authority.\n- Render tool outcomes truthfully.\n",
        type: "text"
      },
      {
        text: "Inspect the planning note before requesting host access.",
        type: "reasoning"
      },
      {
        sourceId: "source-agents-docs",
        title: "Cloudflare Agents docs",
        type: "source-url",
        url: "https://developers.cloudflare.com/agents/"
      },
      {
        filename: "planning-context.md",
        mediaType: "text/markdown",
        sourceId: "source-planning-context",
        title: "Planning context bundle",
        type: "source-document"
      },
      {
        data: {
          activeTasks: 1,
          updatedFiles: 2
        },
        type: "data-execution-metrics"
      },
      {
        errorText: "Host shell unavailable.",
        input: {
          cmd: "rtk npm run build:ui"
        },
        state: "output-error",
        toolCallId: "tool-error-1",
        toolName: "run_command",
        type: "dynamic-tool"
      },
      {
        approval: {
          approved: false,
          id: "approval-denied-1",
          reason: "User rejected host access."
        },
        input: {
          cmd: "wrangler dev"
        },
        state: "output-denied",
        toolCallId: "tool-denied-1",
        toolName: "request_host_access",
        type: "dynamic-tool"
      },
      {
        approval: {
          id: "approval-requested-1"
        },
        input: {
          cmd: "rtk npm run typecheck"
        },
        state: "approval-requested",
        toolCallId: "tool-approval-1",
        toolName: "request_human_approval",
        type: "dynamic-tool"
      },
      {
        filename: "plan.diff",
        mediaType: "text/plain",
        type: "file",
        url: "https://example.com/plan.diff"
      }
    ])
  ];
}

const cloudflareConversationMocks = vi.hoisted(() => ({
  useAgent: vi.fn((options: { agent: string; name?: string; query?: Record<string, string> }) => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    reconnect: vi.fn(),
    ready: Promise.resolve(),
    identified: true,
    state: undefined,
    setState: vi.fn(),
    call: vi.fn(),
    stub: {},
    getHttpUrl: () => `http://example.com/agents/${options.agent}/${options.name ?? "default"}`,
    agent: options.agent,
    name: options.name ?? "default"
  })),
  useAgentChat: vi.fn(() => createCloudflareChatMock())
}));

type WindowWithDevAuth = Window & {
  __KESTONE_UI_DEV_AUTH__?:
    | {
        tenantId?: string;
        token?: string;
      }
    | undefined;
};

vi.mock("agents/react", () => ({
  useAgent: cloudflareConversationMocks.useAgent
}));

vi.mock("@cloudflare/ai-chat/react", () => ({
  useAgentChat: cloudflareConversationMocks.useAgentChat
}));

import type { RunManagementApi, StaticRunDetailRecord } from "../features/runs/run-management-api";
import {
  createStaticRunManagementApi,
  RunManagementApiError
} from "../features/runs/run-management-api";
import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
  cloudflareConversationMocks.useAgent.mockClear();
  cloudflareConversationMocks.useAgentChat.mockImplementation(() => createCloudflareChatMock());
  cloudflareConversationMocks.useAgentChat.mockClear();
  (window as WindowWithDevAuth).__KESTONE_UI_DEV_AUTH__ = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

type FetchRequestRecord = {
  jsonBody?: unknown;
  method: string;
  url: string;
};

function createDeferred<T>() {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject(reason?: unknown) {
      rejectPromise?.(reason);
    },
    resolve(value: T) {
      resolvePromise?.(value);
    }
  };
}

function getPlanningDocumentRegion(documentLabel: string) {
  return screen.getByRole("region", { name: documentLabel });
}

function getPlanningDocumentBodyInput() {
  return screen.getByTestId(
    MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID
  ) as HTMLTextAreaElement;
}

function changePlanningDocumentBody(markdown: string) {
  fireEvent.change(getPlanningDocumentBodyInput(), {
    target: {
      value: markdown
    }
  });
}

function expectPlanningDocumentBodyValue(markdown: string) {
  expect(getPlanningDocumentBodyInput()).toHaveValue(markdown);
}

function normalizeRenderedText(text: string | null | undefined) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

function expectPlanningDocumentHeading(documentLabel: string, heading: string) {
  expect(
    within(getPlanningDocumentRegion(documentLabel)).getByRole("heading", {
      level: 1,
      name: heading
    })
  ).toBeInTheDocument();
}

function expectPlanningDocumentToContain(documentLabel: string, expectedText: string) {
  const normalizedExpectedText = expectedText.replace(/^[-*]\s*/, "").trim();
  const matchingListItem = within(getPlanningDocumentRegion(documentLabel))
    .queryAllByRole("listitem")
    .find((item) => normalizeRenderedText(item.textContent).includes(normalizedExpectedText));

  expect(matchingListItem).toBeTruthy();
}

function expectPlanningChatSurface() {
  expect(screen.getByText("Planning conversation ready")).toBeInTheDocument();
  expect(
    screen.getByText(
      "This document already has an attached planning conversation. Send the next planning turn here."
    )
  ).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText("Continue the planning conversation with Keystone.")
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
}

function expectTaskChatSurface() {
  expect(screen.getByText("Task conversation ready")).toBeInTheDocument();
  expect(
    screen.getByText(
      "This task already has an attached conversation. Send the next implementation turn here."
    )
  ).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText("Continue this task conversation with Keystone.")
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
}

function createRunFixture(
  runId: string,
  overrides: Partial<StaticRunDetailRecord> = {}
): StaticRunDetailRecord {
  const specificationDocumentId = `${runId}-specification`;
  const architectureDocumentId = `${runId}-architecture`;
  const executionPlanDocumentId = `${runId}-execution-plan`;
  const specificationRevisionId = `${runId}-specification-v1`;
  const architectureRevisionId = `${runId}-architecture-v1`;
  const executionPlanRevisionId = `${runId}-execution-plan-v1`;

  return {
    documents: [
      {
        currentRevisionId: specificationRevisionId,
        documentId: specificationDocumentId,
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-specification-conversation`
        }
      },
      {
        currentRevisionId: architectureRevisionId,
        documentId: architectureDocumentId,
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-architecture-conversation`
        }
      },
      {
        currentRevisionId: executionPlanRevisionId,
        documentId: executionPlanDocumentId,
        kind: "execution_plan",
        path: "execution-plan",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-execution-plan-conversation`
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Replace scaffold run detail with live data.\n",
        documentId: specificationDocumentId,
        revision: {
          artifactId: `${runId}-specification-artifact`,
          contentUrl: `/v1/artifacts/${runId}-specification-artifact/content`,
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: specificationRevisionId,
          revisionNumber: 1,
          title: "Run Specification"
        }
      },
      {
        content: "# Architecture\n- Keep route files thin.\n",
        documentId: architectureDocumentId,
        revision: {
          artifactId: `${runId}-architecture-artifact`,
          contentUrl: `/v1/artifacts/${runId}-architecture-artifact/content`,
          createdAt: "2026-04-20T12:05:00.000Z",
          documentRevisionId: architectureRevisionId,
          revisionNumber: 1,
          title: "Run Architecture"
        }
      },
      {
        content: "# Execution Plan\n- Cut over the live provider seam.\n",
        documentId: executionPlanDocumentId,
        revision: {
          artifactId: `${runId}-execution-plan-artifact`,
          contentUrl: `/v1/artifacts/${runId}-execution-plan-artifact/content`,
          createdAt: "2026-04-20T12:10:00.000Z",
          documentRevisionId: executionPlanRevisionId,
          revisionNumber: 1,
          title: "Execution Plan"
        }
      }
    ],
    run: {
      compiledFrom: null,
      endedAt: null,
      executionEngine: "scripted",
      projectId: "project-keystone-cloudflare",
      runId,
      startedAt: "2026-04-20T12:00:00.000Z",
      status: "configured",
      workflowInstanceId: `wf-${runId}`
    },
    taskArtifacts: {},
    tasks: [],
    workflow: {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    },
    ...overrides
  };
}

const runFixtures: Record<string, StaticRunDetailRecord> = {
  "run-101": {
    ...createRunFixture("run-101"),
    documents: [
      {
        currentRevisionId: "run-101-specification-v1",
        documentId: "run-101-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-101-specification-conversation"
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- One planning document exists.\n",
        documentId: "run-101-specification",
        revision: {
          artifactId: "run-101-specification-artifact",
          contentUrl: "/v1/artifacts/run-101-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-101-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      }
    ]
  },
  "run-102": createRunFixture("run-102"),
  "run-103": {
    ...createRunFixture("run-103"),
    documents: [
      {
        currentRevisionId: "run-103-specification-v1",
        documentId: "run-103-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-103-specification-conversation"
        }
      },
      {
        currentRevisionId: "run-103-architecture-v1",
        documentId: "run-103-architecture",
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-103-architecture-conversation"
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Architecture is the current focus.\n",
        documentId: "run-103-specification",
        revision: {
          artifactId: "run-103-specification-artifact",
          contentUrl: "/v1/artifacts/run-103-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-103-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      },
      {
        content: "# Architecture\n- Execution plan is still missing.\n",
        documentId: "run-103-architecture",
        revision: {
          artifactId: "run-103-architecture-artifact",
          contentUrl: "/v1/artifacts/run-103-architecture-artifact/content",
          createdAt: "2026-04-20T12:05:00.000Z",
          documentRevisionId: "run-103-architecture-v1",
          revisionNumber: 1,
          title: "Run Architecture"
        }
      }
    ]
  },
  "run-104": {
    ...createRunFixture("run-104", {
      artifactContents: {
        "/v1/artifacts/artifact-task-032-review/content":
          "diff --git a/ui/src/features/execution/components/task-detail-workspace.tsx b/ui/src/features/execution/components/task-detail-workspace.tsx\nindex 1111111..2222222 100644\n--- a/ui/src/features/execution/components/task-detail-workspace.tsx\n+++ b/ui/src/features/execution/components/task-detail-workspace.tsx\n@@ -18,3 +18,4 @@ export function TaskDetailWorkspace() {\n-  return <p>Artifacts and review</p>;\n+  return <p>Code review</p>;\n+  // keep artifact access inside the authenticated run API seam\n }\ndiff --git a/ui/src/features/execution/components/task-review-sidebar.tsx b/ui/src/features/execution/components/task-review-sidebar.tsx\nnew file mode 100644\n--- /dev/null\n+++ b/ui/src/features/execution/components/task-review-sidebar.tsx\n@@ -0,0 +1,3 @@\n+export function TaskReviewSidebar() {\n+  return \"render unified diffs from task artifact content\";\n+}\n",
        "/v1/artifacts/artifact-task-032-note/content":
          "# Review note\n\nKept task-level review inside the authenticated run API seam.\n"
      },
      run: {
        compiledFrom: {
          architectureRevisionId: "run-104-architecture-v1",
          compiledAt: "2026-04-20T12:20:00.000Z",
          executionPlanRevisionId: "run-104-execution-plan-v1",
          specificationRevisionId: "run-104-specification-v1"
        },
        endedAt: null,
        executionEngine: "think_live",
        projectId: "project-keystone-cloudflare",
        runId: "run-104",
        startedAt: "2026-04-20T12:30:00.000Z",
        status: "active",
        workflowInstanceId: "wf-run-104"
      },
      taskArtifacts: {
        "task-032": [
          {
            artifactId: "artifact-task-032-review",
            contentType: "text/plain; charset=utf-8",
            contentUrl: "/v1/artifacts/artifact-task-032-review/content",
            kind: "staged_output",
            sha256: "task-032-sha",
            sizeBytes: 4096
          },
          {
            artifactId: "artifact-task-032-note",
            contentType: "text/markdown; charset=utf-8",
            contentUrl: "/v1/artifacts/artifact-task-032-note/content",
            kind: "run_note",
            sha256: "task-032-note-sha",
            sizeBytes: 1024
          },
          {
            artifactId: "artifact-task-032-preview",
            contentType: "image/png",
            contentUrl: "/v1/artifacts/artifact-task-032-preview/content",
            kind: "staged_output",
            sha256: "task-032-preview-sha",
            sizeBytes: 8192
          }
        ]
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Draft the run specification.",
          endedAt: "2026-04-20T12:35:00.000Z",
          logicalTaskId: "TASK-030",
          name: "Specification outline",
          runId: "run-104",
          startedAt: "2026-04-20T12:31:00.000Z",
          status: "completed",
          taskId: "task-030",
          updatedAt: "2026-04-20T12:35:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-030"],
          description: "Translate the specification into architecture decisions.",
          endedAt: "2026-04-20T12:42:00.000Z",
          logicalTaskId: "TASK-031",
          name: "Architecture decisions",
          runId: "run-104",
          startedAt: "2026-04-20T12:36:00.000Z",
          status: "completed",
          taskId: "task-031",
          updatedAt: "2026-04-20T12:42:00.000Z"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-104:task:task-032"
          },
          dependsOn: ["task-031"],
          description: "Implement the live run-detail provider.",
          endedAt: null,
          logicalTaskId: "TASK-032",
          name: "Live run provider cutover",
          runId: "run-104",
          startedAt: "2026-04-20T12:43:00.000Z",
          status: "active",
          taskId: "task-032",
          updatedAt: "2026-04-20T12:43:00.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-030", toTaskId: "task-031" },
          { fromTaskId: "task-031", toTaskId: "task-032" }
        ],
        nodes: [
          { dependsOn: [], name: "Specification outline", status: "completed", taskId: "task-030" },
          { dependsOn: ["task-030"], name: "Architecture decisions", status: "completed", taskId: "task-031" },
          { dependsOn: ["task-031"], name: "Live run provider cutover", status: "active", taskId: "task-032" }
        ],
        summary: {
          activeTasks: 1,
          cancelledTasks: 0,
          completedTasks: 2,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 0,
          totalTasks: 3
        }
      }
    })
  },
  "run-105": {
    ...createRunFixture("run-105"),
    documents: [
      {
        currentRevisionId: "run-105-specification-v1",
        documentId: "run-105-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-105-specification-conversation"
        }
      },
      {
        currentRevisionId: null,
        documentId: "run-105-architecture",
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: null
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Architecture has not been written yet.\n",
        documentId: "run-105-specification",
        revision: {
          artifactId: "run-105-specification-artifact",
          contentUrl: "/v1/artifacts/run-105-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-105-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      }
    ]
  },
  "run-106": {
    ...createRunFixture("run-106"),
    documents: [],
    revisions: []
  },
  "run-107": {
    ...createRunFixture("run-107", {
      run: {
        compiledFrom: {
          architectureRevisionId: "run-107-architecture-v1",
          compiledAt: "2026-04-20T12:50:00.000Z",
          executionPlanRevisionId: "run-107-execution-plan-v1",
          specificationRevisionId: "run-107-specification-v1"
        },
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-107",
        startedAt: null,
        status: "configured",
        workflowInstanceId: "wf-run-107"
      }
    })
  },
  "run-108": {
    ...createRunFixture("run-108", {
      artifactContents: {
        "/v1/artifacts/artifact-task-082-diff/content":
          "--- a/ui/src/features/runs/components/execution-plan-workspace.tsx\n+++ b/ui/src/features/runs/components/execution-plan-workspace.tsx\n+ add explicit compile routing into the DAG\n"
      },
      run: {
        compiledFrom: null,
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-108",
        startedAt: "2026-04-20T13:00:00.000Z",
        status: "configured",
        workflowInstanceId: "wf-run-108"
      },
      taskArtifacts: {
        "task-082": [
          {
            artifactId: "artifact-task-082-diff",
            contentType: "text/plain; charset=utf-8",
            contentUrl: "/v1/artifacts/artifact-task-082-diff/content",
            kind: "staged_output",
            sha256: "task-082-sha",
            sizeBytes: 2048
          }
        ]
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Compile the run plan into executable tasks.",
          endedAt: "2026-04-20T13:05:00.000Z",
          logicalTaskId: "TASK-080",
          name: "Compile run plan",
          runId: "run-108",
          startedAt: "2026-04-20T13:01:00.000Z",
          status: "completed",
          taskId: "task-080",
          updatedAt: "2026-04-20T13:05:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-080"],
          description: "Prepare the execution graph for review.",
          endedAt: "2026-04-20T13:07:00.000Z",
          logicalTaskId: "TASK-081",
          name: "Prepare execution graph",
          runId: "run-108",
          startedAt: "2026-04-20T13:05:00.000Z",
          status: "completed",
          taskId: "task-081",
          updatedAt: "2026-04-20T13:07:00.000Z"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-108:task:task-082"
          },
          dependsOn: ["task-081"],
          description: "Review the compiled execution DAG.",
          endedAt: null,
          logicalTaskId: "TASK-082",
          name: "Review execution DAG",
          runId: "run-108",
          startedAt: "2026-04-20T13:08:00.000Z",
          status: "ready",
          taskId: "task-082",
          updatedAt: "2026-04-20T13:08:00.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-080", toTaskId: "task-081" },
          { fromTaskId: "task-081", toTaskId: "task-082" }
        ],
        nodes: [
          { dependsOn: [], name: "Compile run plan", status: "completed", taskId: "task-080" },
          {
            dependsOn: ["task-080"],
            name: "Prepare execution graph",
            status: "completed",
            taskId: "task-081"
          },
          {
            dependsOn: ["task-081"],
            name: "Review execution DAG",
            status: "ready",
            taskId: "task-082"
          }
        ],
        summary: {
          activeTasks: 0,
          cancelledTasks: 0,
          completedTasks: 2,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 1,
          totalTasks: 3
        }
      }
    })
  },
  "run-109": {
    ...createRunFixture("run-109", {
      revisions: [
        {
          content: "# Specification\n- Keep the compiled workflow available while planning changes.\n",
          documentId: "run-109-specification",
          revision: {
            artifactId: "run-109-specification-artifact",
            contentUrl: "/v1/artifacts/run-109-specification-artifact/content",
            createdAt: "2026-04-20T13:10:00.000Z",
            documentRevisionId: "run-109-specification-v1",
            revisionNumber: 1,
            title: "Run Specification"
          }
        },
        {
          content: "# Architecture\n- Recompile when planning revisions drift.\n",
          documentId: "run-109-architecture",
          revision: {
            artifactId: "run-109-architecture-artifact",
            contentUrl: "/v1/artifacts/run-109-architecture-artifact/content",
            createdAt: "2026-04-20T13:12:00.000Z",
            documentRevisionId: "run-109-architecture-v1",
            revisionNumber: 1,
            title: "Run Architecture"
          }
        },
        {
          content: "# Execution Plan\n- Previous compiled revision.\n",
          documentId: "run-109-execution-plan",
          revision: {
            artifactId: "run-109-execution-plan-artifact-v1",
            contentUrl: "/v1/artifacts/run-109-execution-plan-artifact-v1/content",
            createdAt: "2026-04-20T13:14:00.000Z",
            documentRevisionId: "run-109-execution-plan-v1",
            revisionNumber: 1,
            title: "Execution Plan"
          }
        },
        {
          content: "# Execution Plan\n- Current planning revision is newer than the compiled graph.\n",
          documentId: "run-109-execution-plan",
          revision: {
            artifactId: "run-109-execution-plan-artifact-v2",
            contentUrl: "/v1/artifacts/run-109-execution-plan-artifact-v2/content",
            createdAt: "2026-04-20T13:16:00.000Z",
            documentRevisionId: "run-109-execution-plan-v2",
            revisionNumber: 2,
            title: "Execution Plan"
          }
        }
      ],
      documents: [
        {
          currentRevisionId: "run-109-specification-v1",
          documentId: "run-109-specification",
          kind: "specification",
          path: "specification",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-specification-conversation"
          }
        },
        {
          currentRevisionId: "run-109-architecture-v1",
          documentId: "run-109-architecture",
          kind: "architecture",
          path: "architecture",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-architecture-conversation"
          }
        },
        {
          currentRevisionId: "run-109-execution-plan-v2",
          documentId: "run-109-execution-plan",
          kind: "execution_plan",
          path: "execution-plan",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-execution-plan-conversation"
          }
        }
      ],
      run: {
        compiledFrom: {
          architectureRevisionId: "run-109-architecture-v1",
          compiledAt: "2026-04-20T13:15:00.000Z",
          executionPlanRevisionId: "run-109-execution-plan-v1",
          specificationRevisionId: "run-109-specification-v1"
        },
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-109",
        startedAt: "2026-04-20T13:18:00.000Z",
        status: "configured",
        workflowInstanceId: "wf-run-109"
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Inspect the currently compiled workflow.",
          endedAt: null,
          logicalTaskId: "TASK-090",
          name: "Inspect current execution graph",
          runId: "run-109",
          startedAt: "2026-04-20T13:18:30.000Z",
          status: "ready",
          taskId: "task-090",
          updatedAt: "2026-04-20T13:18:30.000Z"
        }
      ],
      workflow: {
        edges: [],
        nodes: [
          {
            dependsOn: [],
            name: "Inspect current execution graph",
            status: "ready",
            taskId: "task-090"
          }
        ],
        summary: {
          activeTasks: 0,
          cancelledTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 1,
          totalTasks: 1
        }
      }
    })
  },
  "run-110": {
    ...createRunFixture("run-110", {
      run: {
        compiledFrom: {
          architectureRevisionId: "run-110-architecture-v1",
          compiledAt: "2026-04-20T13:20:00.000Z",
          executionPlanRevisionId: "run-110-execution-plan-v1",
          specificationRevisionId: "run-110-specification-v1"
        },
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-110",
        startedAt: "2026-04-20T13:21:00.000Z",
        status: "active",
        workflowInstanceId: "wf-run-110"
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Build the shared execution plan foundation.",
          endedAt: "2026-04-20T13:23:00.000Z",
          logicalTaskId: "TASK-110",
          name: "Execution plan foundation",
          runId: "run-110",
          startedAt: "2026-04-20T13:21:30.000Z",
          status: "completed",
          taskId: "task-110-foundation",
          updatedAt: "2026-04-20T13:23:00.000Z"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-110:task:task-110-ui"
          },
          dependsOn: ["task-110-foundation"],
          description: "Apply the workflow-first execution workspace in the UI shell.",
          endedAt: null,
          logicalTaskId: "TASK-111",
          name: "Workflow-first UI cutover",
          runId: "run-110",
          startedAt: "2026-04-20T13:24:00.000Z",
          status: "active",
          taskId: "task-110-ui",
          updatedAt: "2026-04-20T13:24:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-110-foundation"],
          description: "Wire the run routes and data seams for the branching DAG state.",
          endedAt: null,
          logicalTaskId: "TASK-112",
          name: "API route wiring",
          runId: "run-110",
          startedAt: null,
          status: "ready",
          taskId: "task-110-api",
          updatedAt: "2026-04-20T13:24:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-110-ui", "task-110-api"],
          description: "Validate the merged execution changes before release.",
          endedAt: null,
          logicalTaskId: "TASK-113",
          name: "Validation sweep",
          runId: "run-110",
          startedAt: null,
          status: "pending",
          taskId: "task-110-verify",
          updatedAt: "2026-04-20T13:25:00.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-110-foundation", toTaskId: "task-110-ui" },
          { fromTaskId: "task-110-foundation", toTaskId: "task-110-api" },
          { fromTaskId: "task-110-ui", toTaskId: "task-110-verify" },
          { fromTaskId: "task-110-api", toTaskId: "task-110-verify" }
        ],
        nodes: [
          {
            dependsOn: [],
            name: "Execution plan foundation",
            status: "completed",
            taskId: "task-110-foundation"
          },
          {
            dependsOn: ["task-110-foundation"],
            name: "Workflow-first UI cutover",
            status: "active",
            taskId: "task-110-ui"
          },
          {
            dependsOn: ["task-110-foundation"],
            name: "API route wiring",
            status: "ready",
            taskId: "task-110-api"
          },
          {
            dependsOn: ["task-110-ui", "task-110-api"],
            name: "Validation sweep",
            status: "pending",
            taskId: "task-110-verify"
          }
        ],
        summary: {
          activeTasks: 1,
          cancelledTasks: 0,
          completedTasks: 1,
          failedTasks: 0,
          pendingTasks: 1,
          readyTasks: 1,
          totalTasks: 4
        }
      }
    })
  },
  "run-111": {
    ...createRunFixture("run-111", {
      run: {
        compiledFrom: {
          architectureRevisionId: "run-111-architecture-v1",
          compiledAt: "2026-04-20T13:26:00.000Z",
          executionPlanRevisionId: "run-111-execution-plan-v1",
          specificationRevisionId: "run-111-specification-v1"
        },
        endedAt: null,
        executionEngine: "think_live",
        projectId: "project-keystone-cloudflare",
        runId: "run-111",
        startedAt: "2026-04-20T13:26:30.000Z",
        status: "active",
        workflowInstanceId: "wf-run-111"
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Materialize the first task row from the compiled workflow.",
          endedAt: "2026-04-20T13:27:30.000Z",
          logicalTaskId: "TASK-120",
          name: "Foundation bootstrap",
          runId: "run-111",
          startedAt: "2026-04-20T13:26:45.000Z",
          status: "completed",
          taskId: "task-111-foundation",
          updatedAt: "2026-04-20T13:27:30.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-111-foundation", toTaskId: "task-111-ui" },
          { fromTaskId: "task-111-foundation", toTaskId: "task-111-api" }
        ],
        nodes: [
          {
            dependsOn: [],
            name: "Foundation bootstrap",
            status: "completed",
            taskId: "task-111-foundation"
          },
          {
            dependsOn: ["task-111-foundation"],
            name: "Lagging UI task row",
            status: "active",
            taskId: "task-111-ui"
          },
          {
            dependsOn: ["task-111-foundation"],
            name: "Lagging API task row",
            status: "ready",
            taskId: "task-111-api"
          }
        ],
        summary: {
          activeTasks: 1,
          cancelledTasks: 0,
          completedTasks: 1,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 1,
          totalTasks: 3
        }
      }
    })
  }
};

const staticRunApi = createStaticRunManagementApi(runFixtures);

function renderRunRoute(initialEntry: string, runApi: RunManagementApi = staticRunApi) {
  return renderRoute(initialEntry, { runApi });
}

function expectRunDetailStateChrome() {
  expect(screen.getByRole("link", { name: "Back to runs" })).toHaveAttribute("href", "/runs");
  expect(screen.queryByText("Run workspace")).not.toBeInTheDocument();
}

function createRunApi(overrides: Partial<RunManagementApi> = {}): RunManagementApi {
  return {
    ...staticRunApi,
    ...overrides
  };
}

function createRunApiFromFixtures(
  fixtures: Record<string, StaticRunDetailRecord>,
  overrides: Partial<RunManagementApi> = {}
): RunManagementApi {
  return {
    ...createStaticRunManagementApi(fixtures),
    ...overrides
  };
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function createTextResponse(body: string, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType
    }
  });
}

function createRunDetailResponse(run: StaticRunDetailRecord["run"]) {
  return createJsonResponse({
    data: run,
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "run" as const
    }
  });
}

function createTaskCollectionResponse(tasks: NonNullable<StaticRunDetailRecord["tasks"]>) {
  return createJsonResponse({
    data: {
      items: tasks,
      total: tasks.length
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "task" as const
    }
  });
}

function createWorkflowDetailResponse(workflow: NonNullable<StaticRunDetailRecord["workflow"]>) {
  return createJsonResponse({
    data: workflow,
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "workflow_graph" as const
    }
  });
}

function getRequestHeaders(request: RequestInfo | URL, init?: RequestInit) {
  return request instanceof Request ? request.headers : new Headers(init?.headers);
}

function expectDevAuthHeaders(request: RequestInfo | URL, init?: RequestInit) {
  const headers = getRequestHeaders(request, init);

  expect(headers.get("authorization")).toBe("Bearer change-me-local-token");
  expect(headers.get("x-keystone-tenant-id")).toBe("tenant-dev-local");
}

function expectConversationBindingHeaders(
  headers: HeadersInit | undefined,
  auth: { tenantId: string; token: string }
) {
  const normalizedHeaders = new Headers(headers);

  expect(normalizedHeaders.get("authorization")).toBe(`Bearer ${auth.token}`);
  expect(normalizedHeaders.get("x-keystone-tenant-id")).toBe(auth.tenantId);
}

function createErrorResponse(input: { code: string; message: string; status: number }) {
  return createJsonResponse(
    {
      error: {
        code: input.code,
        message: input.message,
        details: null
      }
    },
    input.status
  );
}

function cloneRunFixtures() {
  return structuredClone(runFixtures);
}

function getRunRequestUrl(request: RequestInfo | URL) {
  return typeof request === "string" ? request : request.toString();
}

function getRunRequestMethod(request: RequestInfo | URL, init?: RequestInit) {
  return request instanceof Request ? request.method : init?.method ?? "GET";
}

async function parseRequestJson(request: RequestInfo | URL, init?: RequestInit) {
  if (request instanceof Request) {
    return request.json();
  }

  if (typeof init?.body !== "string") {
    throw new Error("Expected JSON request body.");
  }

  return JSON.parse(init.body);
}

function findRunDocument(run: StaticRunDetailRecord, documentId: string) {
  return run.documents?.find((document) => document.documentId === documentId) ?? null;
}

function findRunRevision(
  run: StaticRunDetailRecord,
  documentId: string,
  documentRevisionId: string
) {
  return (
    run.revisions?.find((candidate) => {
      if (candidate.documentId) {
        return (
          candidate.documentId === documentId &&
          candidate.revision.documentRevisionId === documentRevisionId
        );
      }

      return findRunDocument(run, documentId)?.currentRevisionId === candidate.revision.documentRevisionId;
    }) ?? null
  );
}

function buildCompiledFrom(run: StaticRunDetailRecord) {
  const specification = run.documents?.find((document) => document.path === "specification");
  const architecture = run.documents?.find((document) => document.path === "architecture");
  const executionPlan = run.documents?.find((document) => document.path === "execution-plan");

  if (
    !specification?.currentRevisionId ||
    !architecture?.currentRevisionId ||
    !executionPlan?.currentRevisionId
  ) {
    return null;
  }

  return {
    architectureRevisionId: architecture.currentRevisionId,
    compiledAt: new Date().toISOString(),
    executionPlanRevisionId: executionPlan.currentRevisionId,
    specificationRevisionId: specification.currentRevisionId
  };
}

function getFetchRequests(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([request, init]) => ({
    method: getRunRequestMethod(request, init),
    url: getRunRequestUrl(request)
  }));
}

async function buildFetchRequestRecord(
  request: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchRequestRecord> {
  const record: FetchRequestRecord = {
    method: getRunRequestMethod(request, init),
    url: getRunRequestUrl(request)
  };

  if (request instanceof Request) {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return record;
    }

    try {
      record.jsonBody = await request.clone().json();
    } catch {
      // Ignore non-JSON or unreadable request bodies in the recorder.
    }

    return record;
  }

  if (!new Headers(init?.headers).get("content-type")?.includes("application/json")) {
    return record;
  }

  if (typeof init?.body !== "string" || init.body.length === 0) {
    return record;
  }

  try {
    record.jsonBody = JSON.parse(init.body);
  } catch {
    // Ignore malformed JSON in the recorder so the route handler still surfaces failures.
  }

  return record;
}

function findFetchRequestRecord(
  requestLog: FetchRequestRecord[],
  input: {
    method: string;
    url: string;
  }
) {
  return (
    requestLog.find(
      (request) => request.method === input.method && request.url === input.url
    ) ?? null
  );
}

function expectFetchJsonRequest(
  requestLog: FetchRequestRecord[],
  input: {
    jsonBody: unknown;
    method: string;
    url: string;
  }
) {
  const request = findFetchRequestRecord(requestLog, input);

  expect(request).not.toBeNull();
  expect(request?.jsonBody).toEqual(input.jsonBody);
}

function countFetchRequests(
  fetchMock: ReturnType<typeof vi.fn>,
  input: {
    method: string;
    url: string;
  }
) {
  return getFetchRequests(fetchMock).filter(
    (request) => request.method === input.method && request.url === input.url
  ).length;
}

function createBrowserRunFetch(
  overrides: Record<string, (() => Promise<Response> | Response) | undefined> = {}
) {
  const browserRunFixtures = cloneRunFixtures();
  const requestLog: FetchRequestRecord[] = [];
  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    requestLog.push(await buildFetchRequestRecord(request, init));

    const url = getRunRequestUrl(request);
    const method = getRunRequestMethod(request, init);

    expectDevAuthHeaders(request, init);

    const override = overrides[`${method} ${url}`] ?? overrides[url];

    if (override) {
      return await override();
    }

    const runMatch = url.match(/^\/v1\/runs\/([^/]+)$/);

    if (runMatch) {
      const runId = decodeURIComponent(runMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: run.run,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "run" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runCompileMatch = url.match(/^\/v1\/runs\/([^/]+)\/compile$/);

    if (runCompileMatch) {
      const runId = decodeURIComponent(runCompileMatch[1]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method !== "POST") {
        throw new Error(`Unexpected method ${method} for ${url}`);
      }

      const compiledFrom = buildCompiledFrom(run);

      if (!compiledFrom) {
        return createErrorResponse({
          code: "run_documents_incomplete",
          message:
            "Run compilation requires specification, architecture, and execution-plan documents.",
          status: 409
        });
      }

      run.run = {
        ...run.run,
        compiledFrom,
        status: (run.tasks ?? []).some((task) => task.status === "ready" || task.status === "active")
          ? "active"
          : run.run.status
      };

      return createJsonResponse(
        {
          data: {
            run: run.run,
            status: "accepted",
            workflowInstanceId: run.run.workflowInstanceId
          },
          meta: {
            apiVersion: "v1" as const,
            envelope: "action" as const,
            resourceType: "run" as const
          }
        },
        202
      );
    }

    const runDocumentsMatch = url.match(/^\/v1\/runs\/([^/]+)\/documents$/);

    if (runDocumentsMatch) {
      const runId = decodeURIComponent(runDocumentsMatch[1]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method === "POST") {
        const input = (await parseRequestJson(request, init)) as {
          conversation?: NonNullable<StaticRunDetailRecord["documents"]>[number]["conversation"];
          kind: NonNullable<StaticRunDetailRecord["documents"]>[number]["kind"];
          path: string;
        };

        if (run.documents?.some((document) => document.path === input.path)) {
          return createErrorResponse({
            code: "document_path_conflict",
            message: "A document with that logical path already exists in this scope.",
            status: 409
          });
        }

        const documentId = `${runId}-${input.path.replace(/\//g, "-")}`;
        const createdDocument = {
          conversation: input.conversation ?? null,
          currentRevisionId: null,
          documentId,
          kind: input.kind,
          path: input.path,
          scopeType: "run" as const
        };

        run.documents = [...(run.documents ?? []), createdDocument];

        return createJsonResponse(
          {
            data: createdDocument,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "document" as const
            }
          },
          201
        );
      }

      return createJsonResponse({
        data: {
          items: run.documents ?? [],
          total: run.documents?.length ?? 0
        },
        meta: {
          apiVersion: "v1" as const,
          envelope: "collection" as const,
          resourceType: "document" as const
        }
      });
    }

    const runDocumentRevisionMatch = url.match(
      /^\/v1\/runs\/([^/]+)\/documents\/([^/]+)\/revisions\/([^/]+)$/
    );

    if (runDocumentRevisionMatch) {
      const runId = decodeURIComponent(runDocumentRevisionMatch[1]!);
      const documentId = decodeURIComponent(runDocumentRevisionMatch[2]!);
      const documentRevisionId = decodeURIComponent(runDocumentRevisionMatch[3]!);
      const run = browserRunFixtures[runId];
      const revision = run ? findRunRevision(run, documentId, documentRevisionId) : null;

      return revision
        ? createJsonResponse({
            data: revision.revision,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "document_revision" as const
            }
          })
        : createErrorResponse({
            code: "document_revision_not_found",
            message: `Document revision ${documentRevisionId} was not found for run ${runId}.`,
            status: 404
          });
    }

    const runDocumentRevisionsCollectionMatch = url.match(
      /^\/v1\/runs\/([^/]+)\/documents\/([^/]+)\/revisions$/
    );

    if (runDocumentRevisionsCollectionMatch) {
      const runId = decodeURIComponent(runDocumentRevisionsCollectionMatch[1]!);
      const documentId = decodeURIComponent(runDocumentRevisionsCollectionMatch[2]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method !== "POST") {
        throw new Error(`Unexpected method ${method} for ${url}`);
      }

      const document = findRunDocument(run, documentId);

      if (!document) {
        return createErrorResponse({
          code: "document_not_found",
          message: `Document ${documentId} was not found for run ${runId}.`,
          status: 404
        });
      }

      const input = (await parseRequestJson(request, init)) as {
        body: string;
        title: string;
      };
      const currentRevision = document.currentRevisionId
        ? run.revisions?.find(
            (candidate) => candidate.revision.documentRevisionId === document.currentRevisionId
          ) ?? null
        : null;
      const revisionNumber = (currentRevision?.revision.revisionNumber ?? 0) + 1;
      const createdRevision = {
        content: input.body,
        documentId: document.documentId,
        revision: {
          artifactId: `${document.documentId}-artifact-v${revisionNumber}`,
          contentUrl: `/v1/artifacts/${document.documentId}-artifact-v${revisionNumber}/content`,
          createdAt: new Date().toISOString(),
          documentRevisionId: `${document.documentId}-v${revisionNumber}`,
          revisionNumber,
          title: input.title
        }
      };

      run.revisions = [...(run.revisions ?? []), createdRevision];
      run.documents = (run.documents ?? []).map((candidate) =>
        candidate.documentId === document.documentId
          ? {
              ...candidate,
              currentRevisionId: createdRevision.revision.documentRevisionId
            }
          : candidate
      );

      return createJsonResponse(
        {
          data: createdRevision.revision,
          meta: {
            apiVersion: "v1" as const,
            envelope: "detail" as const,
            resourceType: "document_revision" as const
          }
        },
        201
      );
    }

    const runWorkflowMatch = url.match(/^\/v1\/runs\/([^/]+)\/workflow$/);

    if (runWorkflowMatch) {
      const runId = decodeURIComponent(runWorkflowMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: run.workflow ?? {
              edges: [],
              nodes: [],
              summary: {
                activeTasks: 0,
                cancelledTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                pendingTasks: 0,
                readyTasks: 0,
                totalTasks: 0
              }
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "workflow_graph" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runTasksMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks$/);

    if (runTasksMatch) {
      const runId = decodeURIComponent(runTasksMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: {
              items: run.tasks ?? [],
              total: run.tasks?.length ?? 0
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "collection" as const,
              resourceType: "task" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runTaskArtifactsMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/artifacts$/);

    if (runTaskArtifactsMatch) {
      const runId = decodeURIComponent(runTaskArtifactsMatch[1]!);
      const taskId = decodeURIComponent(runTaskArtifactsMatch[2]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: {
              items: run.taskArtifacts?.[taskId] ?? [],
              total: run.taskArtifacts?.[taskId]?.length ?? 0
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "collection" as const,
              resourceType: "artifact" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    for (const run of Object.values(browserRunFixtures)) {
      const revisionRecord = run.revisions?.find(
        (candidate) => candidate.revision.contentUrl === url
      );

      if (revisionRecord) {
        return createTextResponse(revisionRecord.content);
      }

      const artifactContent = run.artifactContents?.[url];

      if (artifactContent !== undefined) {
        const artifact = Object.values(run.taskArtifacts ?? {})
          .flat()
          .find((candidate) => candidate.contentUrl === url);

        return createTextResponse(artifactContent, artifact?.contentType);
      }
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    requestLog
  };
}

describe("Run routes", () => {
  it("redirects /runs/:runId to specification as the stable run landing", async () => {
    const { router } = renderRunRoute("/runs/run-104");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/specification");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-104/execution");
    expect(await screen.findByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
  });

  it.each(["run-101", "run-102", "run-103", "run-107"])(
    "keeps %s on specification instead of inferring a deeper run phase",
    async (runId) => {
      const { router } = renderRunRoute(`/runs/${runId}`);

      expect(await screen.findByRole("heading", { name: runId })).toBeInTheDocument();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/runs/${runId}/specification`);
      });
      expect(await screen.findByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
    }
  );

  it("keeps the execution materializing state available on the execution route", async () => {
    renderRunRoute("/runs/run-107/execution");

    expect(await screen.findByText("Execution is materializing")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Compile was accepted for this run. Keystone is still materializing the live execution graph."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh execution" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-107/execution");
  });

  it("keeps a brand-new run with no planning documents on specification", async () => {
    const { router } = renderRunRoute("/runs/run-106");

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-106/specification");
    });

    expect(await screen.findByText("No specification document yet")).toBeInTheDocument();
  });

  it("renders the run workspace frame with compact meta copy and stage tabs", async () => {
    renderRunRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to runs" })).toHaveAttribute("href", "/runs");
    expect(screen.getByText("Started 2026-04-20 12:30 UTC")).toBeInTheDocument();
    expect(screen.queryByText("Workflow wf-run-104")).not.toBeInTheDocument();
    expect(screen.queryByText("Engine Think Live")).not.toBeInTheDocument();
    expect(document.querySelector(".run-detail-summary")).toBeNull();

    const phaseNavigation = screen.getByRole("navigation", { name: "Run phases" });

    expect(within(phaseNavigation).getByRole("link", { name: "Specification" })).toHaveAttribute(
      "href",
      "/runs/run-104/specification"
    );
    expect(within(phaseNavigation).getByRole("link", { name: "Architecture" })).toHaveAttribute(
      "href",
      "/runs/run-104/architecture"
    );
    expect(within(phaseNavigation).getByRole("link", { name: "Execution Plan" })).toHaveAttribute(
      "href",
      "/runs/run-104/execution-plan"
    );
    expect(within(phaseNavigation).getByRole("link", { name: "Execution" })).toHaveAttribute(
      "href",
      "/runs/run-104/execution"
    );
    expect(phaseNavigation.querySelectorAll(".run-step-link-summary")).toHaveLength(0);
  });

  it("renders the loading state before the live run provider resolves", async () => {
    const deferredRun = createDeferred<StaticRunDetailRecord["run"]>();
    const runApi = createRunApi({
      getRun: vi.fn(async () => deferredRun.promise)
    });

    renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "Loading run" })).toBeInTheDocument();
    expectRunDetailStateChrome();

    deferredRun.resolve(runFixtures["run-104"]!.run);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });

  it("resets the run-detail provider immediately when navigation switches runs", async () => {
    const deferredRun = createDeferred<StaticRunDetailRecord["run"]>();
    const runApi = createRunApi({
      getRun: vi.fn(async (runId) => {
        if (runId === "run-104") {
          return deferredRun.promise;
        }

        return staticRunApi.getRun(runId);
      })
    });
    const { router } = renderRunRoute("/runs/run-101/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-101" })).toBeInTheDocument();

    void router.navigate("/runs/run-104/specification");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/specification");
    });

    expect(await screen.findByRole("heading", { name: "Loading run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.queryByRole("heading", { name: "run-101" })).not.toBeInTheDocument();

    deferredRun.resolve(runFixtures["run-104"]!.run);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });

  it.each([
    {
      documentHeading: "Architecture",
      documentPath: "architecture",
      expectedLine: "- Keep route files thin.",
      path: "/runs/run-104/architecture",
      phaseHeading: "Architecture conversation",
      revisionTitle: "Run Architecture"
    },
    {
      documentHeading: "Execution Plan",
      documentPath: "execution-plan",
      expectedLine: "- Cut over the live provider seam.",
      path: "/runs/run-104/execution-plan",
      phaseHeading: "Execution Plan conversation",
      revisionTitle: "Execution Plan"
    }
  ])(
    "loads the current planning revision for $path through the live route seam",
    async ({
      documentHeading,
      documentPath,
      expectedLine,
      path,
      phaseHeading,
      revisionTitle
    }) => {
      createBrowserRunFetch();

      renderRoute(path);

      expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: phaseHeading })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: `${revisionTitle} document` })).toBeInTheDocument();
      expect(screen.getByText(documentPath)).toBeInTheDocument();
      expectPlanningChatSurface();
      expectPlanningDocumentHeading(`${revisionTitle} document`, documentHeading);
      expectPlanningDocumentToContain(`${revisionTitle} document`, expectedLine);
    }
  );

  it("renders planning markdown tables through the shared Plate document surface", async () => {
    const fixtures = cloneRunFixtures();
    const runFixture = fixtures["run-104"];

    if (!runFixture) {
      throw new Error("Missing run-104 fixture.");
    }

    if (!runFixture.documents || !runFixture.revisions) {
      throw new Error("Missing planning document fixtures for run-104.");
    }

    const specificationDocument = runFixture.documents.find(
      (document) => document.kind === "specification"
    );
    const specificationRevision = runFixture.revisions.find(
      (candidate) => candidate.documentId === specificationDocument?.documentId
    );

    if (!specificationRevision) {
      throw new Error("Missing specification revision fixture for run-104.");
    }

    specificationRevision.content =
      "# Specification\n\n| Surface | Status |\n| --- | --- |\n| Planning | Live |\n| Documentation | Shared |\n";

    renderRunRoute("/runs/run-104/specification", createRunApiFromFixtures(fixtures));

    const documentRegion = await screen.findByRole("region", {
      name: "Run Specification document"
    });
    const table = within(documentRegion).getByRole("table");

    expect(within(table).getByRole("columnheader", { name: "Surface" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(table).getByText("Planning")).toBeInTheDocument();
    expect(within(table).getByText("Documentation")).toBeInTheDocument();
    expect(within(table).getByText("Shared")).toBeInTheDocument();
  });

  it("keeps the planning document preview stable when markdown includes a horizontal rule", async () => {
    createBrowserRunFetch();

    renderRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    changePlanningDocumentBody("# Specification\n\nBefore divider\n\n---\n\nAfter divider\n");

    const previewRegion = screen.getByRole("region", {
      name: "Run Specification document"
    });

    expect(within(previewRegion).getByRole("separator")).toBeInTheDocument();
    expect(within(previewRegion).getByText("After divider")).toBeInTheDocument();
  });

  it("binds a planning page to the persisted planning conversation locator", async () => {
    const browserAuth = {
      token: "browser-agent-token",
      tenantId: "tenant-browser"
    };
    (window as WindowWithDevAuth).__KESTONE_UI_DEV_AUTH__ = browserAuth;

    renderRunRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expectPlanningChatSurface();

    await waitFor(() => {
      expect(cloudflareConversationMocks.useAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: "PlanningDocumentAgent",
          name: "run-104-specification-conversation",
          query: {
            keystoneTenantId: browserAuth.tenantId,
            keystoneToken: browserAuth.token
          }
        })
      );
    });

    const planningAgentHandle = cloudflareConversationMocks.useAgent.mock.results.find(
      (result) =>
        result.type === "return" &&
        result.value?.agent === "PlanningDocumentAgent" &&
        result.value?.name === "run-104-specification-conversation"
    )?.value;

    expect(planningAgentHandle).toBeTruthy();
    expect(cloudflareConversationMocks.useAgentChat).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: planningAgentHandle
      })
    );
    const planningChatBinding = cloudflareConversationMocks.useAgentChat.mock.calls.find(
      ([options]) => options?.agent === planningAgentHandle
    )?.[0];

    expectConversationBindingHeaders(planningChatBinding?.headers, browserAuth);
    expect(planningChatBinding?.credentials).toBe("same-origin");
  });

  it("renders the unavailable planning conversation surface when no locator is attached", async () => {
    renderRunRoute("/runs/run-105/architecture", createStaticRunManagementApi(cloneRunFixtures()));

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();
    expect(screen.getByText("No planning conversation attached")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create or attach a planning conversation before sending messages from this document."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Conversation unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Conversation input becomes available after a locator is attached.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(cloudflareConversationMocks.useAgent).not.toHaveBeenCalled();
    expect(cloudflareConversationMocks.useAgentChat).not.toHaveBeenCalled();
  });

  it("renders planning transcripts with reasoning, sources, decision requests, and structured tool outcomes", async () => {
    const sendMessage = vi.fn();
    const chatMock = createCloudflareChatMock({
      addToolApprovalResponse: vi.fn(),
      error: new Error("Cloudflare stream lost."),
      messages: createAssistantTranscriptMessages(),
      sendMessage,
      status: "error" as const
    });
    cloudflareConversationMocks.useAgentChat.mockImplementation(() => chatMock);

    renderRunRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Cloudflare stream lost.");
    expect(screen.getByRole("heading", { name: "Transcript summary" })).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Keep Cloudflare as the conversation authority.")
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Summarize the current planning state.")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(
      screen.getByText("Inspect the planning note before requesting host access.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Cloudflare Agents docs/i })
    ).toHaveAttribute("href", "https://developers.cloudflare.com/agents/");
    expect(screen.getByText("source document")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("planning-context.md"))).toBeInTheDocument();
    expect(screen.getByText(/execution metrics/i)).toBeInTheDocument();
    expect(screen.getByText("plan.diff")).toBeInTheDocument();
    expect(screen.getByText("run_command")).toBeInTheDocument();
    expect(screen.getByText("request_host_access")).toBeInTheDocument();
    expect(screen.getByText("request_human_approval")).toBeInTheDocument();
    expect(screen.getByText("Waiting for decision")).toBeInTheDocument();
    expect(screen.getByText("Decision needed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This tool call is waiting on a human decision before work can continue."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Outcome")).toHaveLength(2);
    expect(
      screen.getByText((content) => content.includes("Host shell unavailable."))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("User rejected host access."))
    ).toBeInTheDocument();

    const approveButton = screen.getByRole("button", { name: "Approve" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });

    fireEvent.click(approveButton);
    expect(chatMock.addToolApprovalResponse).toHaveBeenCalledWith({
      approved: true,
      id: "approval-requested-1"
    });

    fireEvent.click(rejectButton);
    expect(chatMock.addToolApprovalResponse).toHaveBeenCalledWith({
      approved: false,
      id: "approval-requested-1"
    });

    fireEvent.change(screen.getByPlaceholderText("Continue the planning conversation with Keystone."), {
      target: {
        value: "Continue from the persisted transcript."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        parts: [
          {
            text: "Continue from the persisted transcript.",
            type: "text"
          }
        ],
        role: "user"
      });
    });
  });

  it("loads the current specification revision, preserves source markdown in the save payload, and stays on-route", async () => {
    const { fetchMock, requestLog } = createBrowserRunFetch();
    const { router } = renderRoute("/runs/run-104/specification");
    const updatedBody =
      '# Specification\n- Replace scaffold run detail with live data.\n- Save current revisions without route churn.\n\n```ts\nconst stage = "execution";\n```\n';

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Run Specification document" })).toBeInTheDocument();
    expect(screen.getByText("specification")).toBeInTheDocument();
    expectPlanningChatSurface();
    expectPlanningDocumentHeading("Run Specification document", "Specification");
    expectPlanningDocumentToContain(
      "Run Specification document",
      "- Replace scaffold run detail with live data."
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));

    fireEvent.change(await screen.findByRole("textbox", { name: "Document title" }), {
      target: {
        value: "Run Specification v2"
      }
    });
    changePlanningDocumentBody(updatedBody);
    expectPlanningDocumentBodyValue(updatedBody);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Specification v2" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification v2 document",
      "- Save current revisions without route churn."
    );
    const documentRegion = getPlanningDocumentRegion("Run Specification v2 document");
    const codeBlock = documentRegion.querySelector("pre");

    expect(codeBlock).not.toBeNull();
    expect(codeBlock).toHaveTextContent('const stage = "execution";');
    expect(codeBlock?.querySelector("code")).not.toBeNull();
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    await screen.findByRole("region", { name: "Run Specification v2 document" });
    expectPlanningDocumentBodyValue(updatedBody);
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await screen.findByRole("button", { name: "Edit document" });

    expectFetchJsonRequest(requestLog, {
      jsonBody: {
        body: updatedBody,
        contentType: "text/markdown; charset=utf-8",
        title: "Run Specification v2"
      },
      method: "POST",
      url: "/v1/runs/run-104/documents/run-104-specification/revisions"
    });

    expect(getFetchRequests(fetchMock)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          url: "/v1/runs/run-104/documents/run-104-specification/revisions"
        })
      ])
    );
  });

  it("treats title-only planning saves as body-preserving revisions and ignores trim-only title churn", async () => {
    const { requestLog } = createBrowserRunFetch();
    const originalBody = "# Architecture\n- Keep route files thin.\n";

    renderRoute("/runs/run-104/architecture");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));

    const titleField = screen.getByRole("textbox", { name: "Document title" });
    fireEvent.change(titleField, {
      target: {
        value: "  Run Architecture  "
      }
    });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(titleField, {
      target: {
        value: "Run Architecture v2"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Architecture v2" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentHeading("Run Architecture v2 document", "Architecture");
    expectPlanningDocumentToContain("Run Architecture v2 document", "- Keep route files thin.");
    expectFetchJsonRequest(requestLog, {
      jsonBody: {
        body: originalBody,
        contentType: "text/markdown; charset=utf-8",
        title: "Run Architecture v2"
      },
      method: "POST",
      url: "/v1/runs/run-104/documents/run-104-architecture/revisions"
    });
  });

  it("keeps planning edits in place and allows retry after a revision save fails", async () => {
    const failedSave = createDeferred<
      Awaited<ReturnType<RunManagementApi["createRunDocumentRevision"]>>
    >();
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let shouldReject = true;
    const createRunDocumentRevision = vi.fn(
      async (...args: Parameters<RunManagementApi["createRunDocumentRevision"]>) => {
        if (shouldReject) {
          shouldReject = false;
          return await failedSave.promise;
        }

        return baseRunApi.createRunDocumentRevision(...args);
      }
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      createRunDocumentRevision
    };
    const { router } = renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Document title" }), {
      target: {
        value: "Run Specification v2"
      }
    });
    changePlanningDocumentBody("# Specification\n- Retry the save after a transient failure.\n");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();

    failedSave.reject(new Error("Unable to save specification changes."));

    expect(await screen.findByText("Unable to save specification changes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Document title" })).toHaveValue(
      "Run Specification v2"
    );
    expectPlanningDocumentBodyValue(
      "# Specification\n- Retry the save after a transient failure.\n"
    );
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Specification v2" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification v2 document",
      "- Retry the save after a transient failure."
    );
    expect(screen.queryByText("Unable to save specification changes.")).not.toBeInTheDocument();
    expect(createRunDocumentRevision).toHaveBeenCalledTimes(2);
  });

  it("deduplicates rapid create and save activations for a planning document", async () => {
    const { fetchMock } = createBrowserRunFetch();

    renderRoute("/runs/run-106/specification");

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();

    const createButton = screen.getByRole("button", {
      name: "Create specification document"
    });
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(await screen.findByRole("textbox", { name: "Document title" })).toHaveValue(
      "Run Specification"
    );

    changePlanningDocumentBody(
      "# Specification\n- Single-flight planning mutations prevent duplicates.\n"
    );

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(await screen.findByRole("heading", { name: "Run Specification" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification document",
      "- Single-flight planning mutations prevent duplicates."
    );
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-106/documents"
      })
    ).toBe(1);
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-106/documents/run-106-specification/revisions"
      })
    ).toBe(1);
  });

  it.each([
    {
      defaultTitle: "Run Specification",
      documentId: "run-106-specification",
      emptyTitle: "No specification document yet",
      expectedLine: "- Define the live planning specification.",
      path: "/runs/run-106/specification"
    },
    {
      defaultTitle: "Run Architecture",
      documentId: "run-106-architecture",
      emptyTitle: "No architecture document yet",
      expectedLine: "- Keep the shared planning layout stable.",
      path: "/runs/run-106/architecture"
    },
    {
      defaultTitle: "Execution Plan",
      documentId: "run-106-execution-plan",
      emptyTitle: "No execution plan document yet",
      expectedLine: "- Save the current execution plan without leaving the route.",
      path: "/runs/run-106/execution-plan"
    }
  ])(
    "creates and saves a missing planning document for $path without route churn",
    async ({ defaultTitle, documentId, emptyTitle, expectedLine, path }) => {
      const { fetchMock, requestLog } = createBrowserRunFetch();
      const { router } = renderRoute(path);
      const documentPath =
        path === "/runs/run-106/specification"
          ? "specification"
          : path === "/runs/run-106/architecture"
            ? "architecture"
            : "execution-plan";
      const documentKind =
        documentPath === "specification"
          ? "specification"
          : documentPath === "architecture"
            ? "architecture"
            : "execution_plan";

      expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
      expect(screen.getByText(emptyTitle)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Create`, "i") }));

      expect(await screen.findByRole("textbox", { name: "Document title" })).toHaveValue(
        defaultTitle
      );

      changePlanningDocumentBody(`${defaultTitle}\n${expectedLine}\n`);

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByRole("heading", { name: defaultTitle })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
      });
      expectPlanningDocumentToContain(`${defaultTitle} document`, expectedLine);
      expect(router.state.location.pathname).toBe(path);

      expect(getFetchRequests(fetchMock)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "POST",
            url: `/v1/runs/run-106/documents`
          }),
          expect.objectContaining({
            method: "POST",
            url: `/v1/runs/run-106/documents/${documentId}/revisions`
          })
        ])
      );
      expectFetchJsonRequest(requestLog, {
        jsonBody: {
          kind: documentKind,
          path: documentPath
        },
        method: "POST",
        url: "/v1/runs/run-106/documents"
      });
    }
  );

  it("reconciles document path conflicts by reloading the existing backend document state", async () => {
    const existingDocument = {
      conversation: {
        agentClass: "PlanningDocumentAgent",
        agentName: "run-106-architecture-conversation"
      },
      currentRevisionId: "run-106-architecture-v1",
      documentId: "run-106-architecture",
      kind: "architecture" as const,
      path: "architecture",
      scopeType: "run" as const
    };
    let listRunDocumentsCallCount = 0;
    const listRunDocuments = vi.fn(async () => {
      listRunDocumentsCallCount += 1;

      return listRunDocumentsCallCount === 1 ? [] : [existingDocument];
    });
    const createRunDocument = vi.fn(async () => {
      throw new RunManagementApiError({
        code: "document_path_conflict",
        message: "A document with that logical path already exists in this scope.",
        status: 409
      });
    });
    const getRunDocumentRevision = vi.fn(async () => ({
      artifactId: "run-106-architecture-artifact",
      contentUrl: "/v1/artifacts/run-106-architecture-artifact/content",
      createdAt: "2026-04-20T12:05:00.000Z",
      documentRevisionId: "run-106-architecture-v1",
      revisionNumber: 1,
      title: "Run Architecture"
    }));
    const getDocumentContent = vi.fn(
      async () => "# Architecture\n- Conflict recovery reflects backend truth.\n"
    );

    renderRunRoute(
      "/runs/run-106/architecture",
      createRunApi({
        createRunDocument,
        getDocumentContent,
        getRunDocumentRevision,
        listRunDocuments
      })
    );

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
    expect(screen.getByText("No architecture document yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create architecture document" }));

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Architecture document",
      "- Conflict recovery reflects backend truth."
    );
    expect(screen.queryByText("No architecture document yet")).not.toBeInTheDocument();
    expect(createRunDocument).toHaveBeenCalledTimes(1);
    expect(listRunDocuments).toHaveBeenCalledTimes(2);
  });

  it("lets a planning page with no current revision enter the editor, discard changes, and save", async () => {
    const { router } = renderRunRoute(
      "/runs/run-105/architecture",
      createStaticRunManagementApi(cloneRunFixtures())
    );

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();
    expect(screen.getByText("No current architecture revision")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Document title" })).toHaveValue(
        "Run Architecture"
      );
    });
    changePlanningDocumentBody("# Architecture\n- Discarded draft changes.\n");

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getByText("No current architecture revision")).toBeInTheDocument();
    expect(
      screen.queryByTestId(MARKDOWN_DOCUMENT_EDITOR_SOURCE_TEST_ID)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    expectPlanningDocumentBodyValue("");
    changePlanningDocumentBody("# Architecture\n- Save the first architecture revision.\n");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Architecture document",
      "- Save the first architecture revision."
    );
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
  });

  it("blocks route changes away from dirty planning edits until the user confirms", async () => {
    const confirmMock = vi.fn(() => false);

    vi.stubGlobal("confirm", confirmMock);

    const { router } = renderRunRoute(
      "/runs/run-105/architecture",
      createStaticRunManagementApi(cloneRunFixtures())
    );

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    changePlanningDocumentBody("# Architecture\n- Guard this draft.\n");

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        "You have unsaved changes in Architecture. Leave this document without saving?"
      );
    });
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
    expectPlanningDocumentBodyValue("# Architecture\n- Guard this draft.\n");

    confirmMock.mockReturnValue(true);

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/documentation");
    });
    expect(await screen.findByRole("heading", { name: "Documentation" })).toBeInTheDocument();
  });

  it("registers a beforeunload warning while a planning draft has unsaved changes", async () => {
    renderRunRoute("/runs/run-105/architecture", createStaticRunManagementApi(cloneRunFixtures()));

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    await screen.findByRole("textbox", { name: "Document title" });
    changePlanningDocumentBody("# Architecture\n- Warn before unload.\n");

    const beforeUnloadEvent = new Event("beforeunload", {
      cancelable: true
    }) as unknown as BeforeUnloadEvent;

    Object.defineProperty(beforeUnloadEvent, "returnValue", {
      configurable: true,
      value: "",
      writable: true
    });

    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect(beforeUnloadEvent.returnValue).toBe(
      "You have unsaved changes in Architecture. Leave this document without saving?"
    );

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    const cleanBeforeUnloadEvent = new Event("beforeunload", {
      cancelable: true
    }) as unknown as BeforeUnloadEvent;

    Object.defineProperty(cleanBeforeUnloadEvent, "returnValue", {
      configurable: true,
      value: "",
      writable: true
    });

    window.dispatchEvent(cleanBeforeUnloadEvent);

    expect(cleanBeforeUnloadEvent.defaultPrevented).toBe(false);
    expect(cleanBeforeUnloadEvent.returnValue).toBe("");
  });

  it("keeps the navigation guard active while a planning save is still pending", async () => {
    const confirmMock = vi.fn(() => false);
    const pendingSave = createDeferred<void>();
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    const createRunDocumentRevision = vi.fn(
      async (...args: Parameters<RunManagementApi["createRunDocumentRevision"]>) => {
        await pendingSave.promise;
        return baseRunApi.createRunDocumentRevision(...args);
      }
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      createRunDocumentRevision
    };

    vi.stubGlobal("confirm", confirmMock);

    const { router } = renderRunRoute("/runs/run-105/architecture", runApi);

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    await screen.findByRole("textbox", { name: "Document title" });
    changePlanningDocumentBody("# Architecture\n- Save is still pending.\n");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();
    expect(createRunDocumentRevision).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Document title" })).toBeDisabled();
    expect(getPlanningDocumentBodyInput()).toBeDisabled();

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        "You have unsaved changes in Architecture. Leave this document without saving?"
      );
    });
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
    expectPlanningDocumentBodyValue("# Architecture\n- Save is still pending.\n");

    pendingSave.resolve(undefined);

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain("Run Architecture document", "- Save is still pending.");
  });

  it("only exposes Compile run when the live planning documents are ready for compilation", async () => {
    renderRunRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compile run" })).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-103/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-103" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Compile becomes available once current revisions exist for: Execution Plan."
      )
    ).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-104/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open execution" })).toHaveAttribute(
      "href",
      "/runs/run-104/execution"
    );

    cleanup();

    renderRunRoute("/runs/run-109/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-109" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recompile run" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open current execution" })).toHaveAttribute(
      "href",
      "/runs/run-109/execution"
    );
    expect(
      screen.getByText("Current planning revisions are newer than the execution graph.")
    ).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-107/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();
  });

  it("refreshes a blocked compile state until execution becomes available", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const materializedWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [
        {
          dependsOn: [],
          name: "Inspect materialized execution",
          status: "ready",
          taskId: "task-107-refresh"
        }
      ],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 1,
        totalTasks: 1
      }
    };
    const materializedTasks: NonNullable<StaticRunDetailRecord["tasks"]> = [
      {
        conversation: null,
        dependsOn: [],
        description: "Inspect the materialized execution graph.",
        endedAt: null,
        logicalTaskId: "TASK-107",
        name: "Inspect materialized execution",
        runId: "run-107",
        startedAt: null,
        status: "ready",
        taskId: "task-107-refresh",
        updatedAt: "2026-04-20T13:00:00.000Z"
      }
    ];
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let workflowCallCount = 0;
    const getRunWorkflow = vi.fn(async () => {
      workflowCallCount += 1;
      return workflowCallCount === 1 ? emptyWorkflow : materializedWorkflow;
    });
    const listRunTasks = vi.fn(async () =>
      workflowCallCount === 1 ? [] : materializedTasks
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRunWorkflow,
      listRunTasks
    };

    renderRunRoute("/runs/run-107/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh run" }));

    await waitFor(() => {
      expect(getRunWorkflow).toHaveBeenCalledTimes(2);
    });
    expect(listRunTasks).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("link", { name: "Open execution" })).toHaveAttribute(
      "href",
      "/runs/run-107/execution"
    );
  });

  it("replaces stale ready detail with the shared error state when a refresh retry fails", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let workflowCallCount = 0;
    const getRunWorkflow = vi.fn(async () => {
      workflowCallCount += 1;

      if (workflowCallCount === 1) {
        return emptyWorkflow;
      }

      throw new Error("Run detail refresh failed.");
    });
    const listRunTasks = vi.fn(async () => []);
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRunWorkflow,
      listRunTasks
    };

    renderRunRoute("/runs/run-107/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh run" }));

    expect(await screen.findByRole("heading", { name: "Unable to load run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run detail refresh failed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh run" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available."
      )
    ).not.toBeInTheDocument();
  });

  it("keeps terminal run compile messaging aligned with the current run status", async () => {
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    const getRun = vi.fn(async (runId: string) => {
      const run = await baseRunApi.getRun(runId);

      if (runId === "run-108") {
        return {
          ...run,
          endedAt: "2026-04-20T13:30:00.000Z",
          startedAt: "2026-04-20T13:00:00.000Z",
          status: "cancelled"
        };
      }

      if (runId === "run-109") {
        return {
          ...run,
          endedAt: "2026-04-20T13:30:00.000Z",
          status: "failed"
        };
      }

      return run;
    });
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRun
    };

    renderRunRoute("/runs/run-108/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();
    expect(
      screen.getByText("Run status is Cancelled. This run cannot be compiled again.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-109/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-109" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run status is Failed. Execution still reflects older planning revisions and cannot be refreshed here."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open current execution" })).toHaveAttribute(
      "href",
      "/runs/run-109/execution"
    );
  });

  it("compiles a ready run, refreshes live state, and routes into execution", async () => {
    const { fetchMock } = createBrowserRunFetch();
    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    await waitFor(() => {
      expect(
        countFetchRequests(fetchMock, {
          method: "POST",
          url: "/v1/runs/run-108/compile"
        })
      ).toBe(1);
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-108/execution");
    });

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-108/execution");
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-108/compile"
      })
    ).toBe(1);
  });

  it("routes into execution and waits there while a delayed compile materializes the workflow", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const compiledRun = {
      ...runFixtures["run-108"]!.run,
      compiledFrom: buildCompiledFrom(runFixtures["run-108"]!)
    };
    const compiledTasks = runFixtures["run-108"]!.tasks ?? [];
    const compiledWorkflow = runFixtures["run-108"]!.workflow!;
    let workflowRequestCount = 0;
    let compileAccepted = false;

    createBrowserRunFetch({
      "/v1/runs/run-108": () =>
        createRunDetailResponse(compileAccepted ? compiledRun : runFixtures["run-108"]!.run),
      "/v1/runs/run-108/compile": () => {
        compileAccepted = true;

        return createJsonResponse(
          {
            data: {
              run: compiledRun,
              status: "accepted",
              workflowInstanceId: compiledRun.workflowInstanceId
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "action" as const,
              resourceType: "run" as const
            }
          },
          202
        );
      },
      "/v1/runs/run-108/workflow": () => {
        workflowRequestCount += 1;

        return createWorkflowDetailResponse(
          workflowRequestCount >= 3 ? compiledWorkflow : emptyWorkflow
        );
      },
      "/v1/runs/run-108/tasks": () =>
        createTaskCollectionResponse(workflowRequestCount >= 3 ? compiledTasks : [])
    });

    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-108/execution");
    });
    expect(await screen.findByText("Execution is materializing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh execution" }));

    await waitFor(() => {
      expect(workflowRequestCount).toBeGreaterThanOrEqual(3);
    });
    expect(await screen.findByLabelText("Execution summary")).toHaveTextContent(
      "3 tasks across 3 dependency steps"
    );
  });

  it("does not navigate back into an older run when compile acceptance resolves after switching routes", async () => {
    const compiledRun = {
      ...runFixtures["run-108"]!.run,
      compiledFrom: buildCompiledFrom(runFixtures["run-108"]!)
    };
    const deferredCompileResponse = createDeferred<Response>();
    let compileAccepted = false;

    createBrowserRunFetch({
      "/v1/runs/run-108": () =>
        createRunDetailResponse(compileAccepted ? compiledRun : runFixtures["run-108"]!.run),
      "/v1/runs/run-108/compile": () => {
        return deferredCompileResponse.promise;
      }
    });

    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    await router.navigate("/runs/run-104/specification");
    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    compileAccepted = true;
    deferredCompileResponse.resolve(
      createJsonResponse(
        {
          data: {
            run: compiledRun,
            status: "accepted",
            workflowInstanceId: compiledRun.workflowInstanceId
          },
          meta: {
            apiVersion: "v1" as const,
            envelope: "action" as const,
            resourceType: "run" as const
          }
        },
        202
      )
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/specification");
    });
  });

  it("renders a planning-page error state when the current revision cannot be read", async () => {
    const runApi = createRunApi({
      getRunDocumentRevision: vi.fn(async (runId, documentId, documentRevisionId) => {
        if (documentRevisionId === "run-104-specification-v1") {
          throw new Error("Revision load failed.");
        }

        return staticRunApi.getRunDocumentRevision(runId, documentId, documentRevisionId);
      })
    });

    renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByText("Unable to load specification")).toBeInTheDocument();
    expect(screen.getByText("Revision load failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("surfaces browser-backed run not-found states without the static seam", async () => {
    createBrowserRunFetch();

    renderRoute("/runs/run-404/specification");

    expect(await screen.findByRole("heading", { name: "Run not found" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run run-404 was not found.")).toBeInTheDocument();
  });

  it("surfaces browser-backed run load failures without falling through to stale content", async () => {
    createBrowserRunFetch({
      "/v1/runs/run-104": () =>
        createErrorResponse({
          code: "request_failed",
          message: "Run detail load exploded.",
          status: 503
        })
    });

    renderRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "Unable to load run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run detail load exploded.")).toBeInTheDocument();
  });

  it("renders the execution DAG shell from live workflow data", async () => {
    renderRunRoute("/runs/run-104/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    const graphRegion = screen.getByLabelText("Execution workflow graph");
    expect(screen.getByLabelText("Execution summary")).toHaveTextContent(
      "3 tasks across 3 dependency steps"
    );
    expect(
      within(graphRegion).getByRole("button", {
        name: /Live run provider cutover/i
      })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Execution status")).toHaveTextContent("1 in progress");
    expect(screen.getByLabelText("Execution status")).toHaveTextContent("2 completed");
    expect(within(graphRegion).queryByText(/unlocks/i)).not.toBeInTheDocument();
    expect(document.querySelector(".execution-board-note")).toBeNull();
    expect(document.querySelector(".execution-graph-node-footnote")).toBeNull();
  });

  it("opens task detail directly when the operator clicks a ready DAG node", async () => {
    const { router } = renderRunRoute("/runs/run-104/execution");

    const graphRegion = await screen.findByLabelText("Execution workflow graph");
    fireEvent.click(
      within(graphRegion).getByRole("button", {
        name: /Architecture decisions/i
      })
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution/tasks/task-031");
    });
    expect(await screen.findByRole("heading", { name: "run-104 / task-031" })).toBeInTheDocument();
    expect(screen.getByText("Translate the specification into architecture decisions.")).toBeInTheDocument();
  });

  it("keeps the task-detail handoff honest while workflow nodes are ahead of task rows", async () => {
    const { router } = renderRunRoute("/runs/run-111/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    const graphRegion = screen.getByLabelText("Execution workflow graph");
    expect(
      within(graphRegion).getByRole("button", {
        name: /Lagging UI task row/i
      })
    ).toBeInTheDocument();
    fireEvent.click(
      within(graphRegion).getByRole("button", {
        name: /Foundation bootstrap/i
      })
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-111/execution/tasks/task-111-foundation");
    });
    expect(await screen.findByRole("heading", { name: "run-111 / task-111-foundation" })).toBeInTheDocument();
    expect(screen.getByText("Materialize the first task row from the compiled workflow.")).toBeInTheDocument();
  });

  it("renders branching DAG steps and supports right-rail task selection across the branch", async () => {
    const { router } = renderRunRoute("/runs/run-110/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    const graphRegion = screen.getByLabelText("Execution workflow graph");
    expect(screen.getByLabelText("Execution summary")).toHaveTextContent(
      "4 tasks across 3 dependency steps"
    );
    expect(screen.getByText("2 parallel tasks in this step")).toBeInTheDocument();
    expect(
      within(graphRegion).getByRole("button", {
        name: /Workflow-first UI cutover/i
      })
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      within(graphRegion).getByRole("button", {
        name: /Validation sweep/i
      })
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-110/execution/tasks/task-110-verify");
    });
    expect(await screen.findByRole("heading", { name: "run-110 / task-110-verify" })).toBeInTheDocument();
    expect(screen.getByText("Validate the merged execution changes before release.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /API route wiring/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-110/execution/tasks/task-110-api");
    });
    expect(await screen.findByRole("heading", { name: "run-110 / task-110-api" })).toBeInTheDocument();
    expect(screen.getByText("Wire the run routes and data seams for the branching DAG state.")).toBeInTheDocument();
  });

  it("defaults the execution inspector to the ready task when no work is active", async () => {
    const { router } = renderRunRoute("/runs/run-109/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    const graphRegion = screen.getByLabelText("Execution workflow graph");
    expect(screen.getByLabelText("Execution status")).toHaveTextContent("1 ready next");
    expect(
      within(graphRegion).getByRole("button", {
        name: /Inspect current execution graph/i
      })
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      within(graphRegion).getByRole("button", {
        name: /Inspect current execution graph/i
      })
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-109/execution/tasks/task-090");
    });
  });

  it("renders an honest execution empty state when compile has not produced a workflow", async () => {
    renderRunRoute("/runs/run-102/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(
      screen.getByText("Execution becomes available after this run has been compiled.")
    ).toBeInTheDocument();
    const phaseNavigation = screen.getByRole("navigation", { name: "Run phases" });
    const executionStep = within(phaseNavigation).getByRole("link", {
      name: "Execution. Compile the run to open execution."
    });

    expect(within(phaseNavigation).queryByRole("link", { name: "Execution" })).not.toBeInTheDocument();
    expect(executionStep).toHaveAttribute("aria-disabled", "true");
    expect(executionStep).toHaveAttribute("tabindex", "0");
    expect(executionStep).toHaveTextContent("Compile the run to open execution.");
  });

  it("renders task conversation and code review without approval framing", async () => {
    renderRunRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Task conversation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Code review" })).toBeInTheDocument();
    expectTaskChatSurface();
    expect(screen.getByText("Task workspace")).toBeInTheDocument();
    const taskPanel = screen.getByText("Task workspace").closest(".workspace-panel");
    const reviewPanel = screen.getByRole("heading", { name: "Code review" }).closest(".workspace-panel");

    expect(taskPanel).not.toBeNull();
    expect(reviewPanel).not.toBeNull();
    expect(taskPanel?.querySelector(".workspace-panel-summary")).toBeNull();
    expect(reviewPanel?.querySelector(".workspace-panel-summary")).toBeNull();
    expect(screen.queryByText(/approvals/i)).not.toBeInTheDocument();
    expect(await screen.findByText("Modified files")).toBeInTheDocument();
    expect(screen.getByText("Added files")).toBeInTheDocument();
    expect(screen.getByText("ui/src/features/execution/components/task-detail-workspace.tsx")).toBeInTheDocument();
    expect(screen.getByText("ui/src/features/execution/components/task-review-sidebar.tsx")).toBeInTheDocument();
    expect(screen.getByText("Supporting artifacts")).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-note")).toBeInTheDocument();
    expect(screen.getByText("run_note · text/markdown; charset=utf-8 · 1.0 KB")).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-preview")).toBeInTheDocument();
    expect(screen.getByText("staged_output · image/png · 8.0 KB")).toBeInTheDocument();
    expect(
      await screen.findByText((content) =>
        content.includes("keep artifact access inside the authenticated run API seam")
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText((content) =>
        content.includes("render unified diffs from task artifact content")
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Depends on")).toBeInTheDocument();
    expect(screen.getByText("Downstream tasks")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load text preview" })).not.toBeInTheDocument();
    expect(screen.queryByText("Artifacts and review")).not.toBeInTheDocument();
  });

  it("binds task detail to the persisted task conversation locator without synthesizing a fallback", async () => {
    const browserAuth = {
      token: "browser-task-token",
      tenantId: "tenant-task-browser"
    };
    (window as WindowWithDevAuth).__KESTONE_UI_DEV_AUTH__ = browserAuth;

    renderRunRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expectTaskChatSurface();
    expect(
      screen.queryByText(/Live task conversation remains out of scope in this phase/i)
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(cloudflareConversationMocks.useAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: "KeystoneThinkAgent",
          name: "tenant:tenant-dev-local:run:run-104:task:task-032",
          query: {
            keystoneTenantId: browserAuth.tenantId,
            keystoneToken: browserAuth.token
          }
        })
      );
    });

    const taskAgentHandle = cloudflareConversationMocks.useAgent.mock.results.find(
      (result) =>
        result.type === "return" &&
        result.value?.agent === "KeystoneThinkAgent" &&
        result.value?.name === "tenant:tenant-dev-local:run:run-104:task:task-032"
    )?.value;

    expect(taskAgentHandle).toBeTruthy();
    expect(cloudflareConversationMocks.useAgentChat).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: taskAgentHandle
      })
    );
    const taskChatBinding = cloudflareConversationMocks.useAgentChat.mock.calls.find(
      ([options]) => options?.agent === taskAgentHandle
    )?.[0];

    expectConversationBindingHeaders(taskChatBinding?.headers, browserAuth);
    expect(taskChatBinding?.credentials).toBe("same-origin");
  });

  it("shows live task loading state while a Cloudflare turn is still in flight", async () => {
    cloudflareConversationMocks.useAgentChat.mockImplementation(() =>
      createCloudflareChatMock({
        status: "submitted" as const
      })
    );

    renderRunRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(screen.getByText("Streaming live")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("keeps non-diff review candidates as supporting metadata when no unified diff can be parsed", async () => {
    const fixtures = cloneRunFixtures();
    const runFixture = fixtures["run-104"];

    if (!runFixture) {
      throw new Error("Missing run-104 fixture.");
    }

    runFixture.artifactContents = {
      ...(runFixture.artifactContents ?? {}),
      "/v1/artifacts/artifact-task-032-review/content":
        "# Review note\n\nNo patch was attached to this task output.\n"
    };

    renderRunRoute(
      "/runs/run-104/execution/tasks/task-032",
      createRunApiFromFixtures(fixtures)
    );

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(
      await screen.findByText("No changed files were parsed from the current reviewable text artifacts.")
    ).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-review")).toBeInTheDocument();
    expect(screen.getByText("staged_output · text/plain; charset=utf-8 · 4.0 KB")).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-note")).toBeInTheDocument();
  });

  it("keeps successful changed files visible when one reviewable text artifact fails to load", async () => {
    const fixtures = cloneRunFixtures();
    const baseRunApi = createStaticRunManagementApi(fixtures);
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getArtifactContent: vi.fn(async (contentUrl) => {
        if (contentUrl === "/v1/artifacts/artifact-task-032-note/content") {
          throw new Error("Run note fetch failed.");
        }

        return baseRunApi.getArtifactContent(contentUrl);
      })
    };

    renderRunRoute("/runs/run-104/execution/tasks/task-032", runApi);

    expect(await screen.findByText("Modified files")).toBeInTheDocument();
    expect(
      screen.getByText("1 reviewable text artifact could not be loaded and is omitted from this view.")
    ).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-note")).toBeInTheDocument();
  });

  it("retries changed-file loading after review content fetch fails", async () => {
    const fixtures = cloneRunFixtures();
    const baseRunApi = createStaticRunManagementApi(fixtures);
    let failReviewLoads = true;
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getArtifactContent: vi.fn(async (contentUrl) => {
        if (
          failReviewLoads &&
          (contentUrl === "/v1/artifacts/artifact-task-032-review/content" ||
            contentUrl === "/v1/artifacts/artifact-task-032-note/content")
        ) {
          throw new Error("Review artifact fetch failed.");
        }

        return baseRunApi.getArtifactContent(contentUrl);
      })
    };

    renderRunRoute("/runs/run-104/execution/tasks/task-032", runApi);

    expect(await screen.findByText("Unable to load changed files")).toBeInTheDocument();
    expect(screen.getByText("Review artifact fetch failed.")).toBeInTheDocument();

    failReviewLoads = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry review" }));

    expect(await screen.findByText("Modified files")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load changed files")).not.toBeInTheDocument();
  });

  it("clears pending changed-file state when routing to a task with no review artifacts", async () => {
    const fixtures = cloneRunFixtures();
    const baseRunApi = createStaticRunManagementApi(fixtures);
    const deferredReviewContent = createDeferred<string>();
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getArtifactContent: vi.fn(async (contentUrl) => {
        if (contentUrl === "/v1/artifacts/artifact-task-032-review/content") {
          return deferredReviewContent.promise;
        }

        return baseRunApi.getArtifactContent(contentUrl);
      })
    };

    const { router } = renderRunRoute("/runs/run-104/execution/tasks/task-032", runApi);

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(
      await screen.findByText("Loading changed files from the current task artifacts.")
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("list", { name: "Depends on" })).getByRole("link", {
        name: /task-031/i
      })
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution/tasks/task-031");
    });
    expect(await screen.findByRole("heading", { name: "run-104 / task-031" })).toBeInTheDocument();
    expect(await screen.findByText("No artifacts are recorded for this task yet.")).toBeInTheDocument();
    expect(screen.queryByText("Modified files")).not.toBeInTheDocument();

    deferredReviewContent.resolve(
      await baseRunApi.getArtifactContent("/v1/artifacts/artifact-task-032-review/content")
    );

    await waitFor(() => {
      expect(screen.getByText("No artifacts are recorded for this task yet.")).toBeInTheDocument();
      expect(screen.queryByText("Modified files")).not.toBeInTheDocument();
      expect(
        screen.queryByText("ui/src/features/execution/components/task-review-sidebar.tsx")
      ).not.toBeInTheDocument();
    });
  });

  it("renders a task-detail error state when artifact metadata fails to load", async () => {
    const runApi = createRunApi({
      listTaskArtifacts: vi.fn(async (runId, taskId) => {
        if (taskId === "task-032") {
          throw new Error("Artifact load failed.");
        }

        return staticRunApi.listTaskArtifacts(runId, taskId);
      })
    });

    renderRunRoute("/runs/run-104/execution/tasks/task-032", runApi);

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(await screen.findByText("Unable to load task review")).toBeInTheDocument();
    expect(screen.getByText("Artifact load failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("keeps a lagging workflow task route in a truthful materializing state", async () => {
    renderRunRoute("/runs/run-111/execution/tasks/task-111-ui");

    expect(await screen.findByRole("heading", { name: "run-111 / task-111-ui" })).toBeInTheDocument();
    expect(screen.getByText("Execution unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Task task-111-ui is still materializing for run run-111. Return to the DAG and wait for the live task record."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Task not found")).not.toBeInTheDocument();
  });

  it("surfaces an invalid task route as a truthful not-found state", async () => {
    renderRunRoute("/runs/run-104/execution/tasks/task-999");

    expect(await screen.findByRole("heading", { name: "run-104 / task-999" })).toBeInTheDocument();
    expect(screen.getByText("Task not found")).toBeInTheDocument();
    expect(screen.getByText("Task task-999 was not found for run run-104.")).toBeInTheDocument();
    expect(screen.queryByText("Unexpected Application Error!")).not.toBeInTheDocument();
  });

  it("opens the scaffold run index row into the live run-detail route", async () => {
    const { router } = renderRunRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    const row = (await screen.findByRole("link", { name: "Run-104" })).closest("tr");

    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByText("Project workspace navigation"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });
});
