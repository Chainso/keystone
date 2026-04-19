import { DurableObject } from "cloudflare:workers";

import type { WorkerBindings } from "../env";
import type { RunCoordinatorSnapshot } from "../lib/runs/summary";

type PublishedEvent = {
  eventType: string;
  severity: string;
  timestamp: string;
};

type InitializeInput = {
  tenantId: string;
  runId: string;
  status: string;
};

type PublishInput = {
  eventType: string;
  severity?: string | undefined;
  timestamp?: string | undefined;
  status?: string | undefined;
};

const SNAPSHOT_STORAGE_KEY = "run-coordinator-snapshot";

export class RunCoordinatorDO extends DurableObject<WorkerBindings> {
  private snapshot: RunCoordinatorSnapshot | null = null;
  private sockets = new Set<WebSocket>();

  constructor(ctx: DurableObjectState, env: WorkerBindings) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      this.snapshot =
        (await this.ctx.storage.get<RunCoordinatorSnapshot>(SNAPSHOT_STORAGE_KEY)) ?? null;
    });
  }

  async initialize(input: InitializeInput) {
    const existingSnapshot = await this.loadSnapshot();

    if (!existingSnapshot) {
      this.snapshot = {
        tenantId: input.tenantId,
        runId: input.runId,
        status: input.status,
        updatedAt: new Date().toISOString(),
        websocketCount: 0,
        latestEvent: null,
        eventCount: 0
      };
      await this.persistSnapshot();
    }

    return this.snapshot;
  }

  async publish(input: PublishInput) {
    const snapshot = await this.requireSnapshot();
    const timestamp = input.timestamp ?? new Date().toISOString();
    const event: PublishedEvent = {
      eventType: input.eventType,
      severity: input.severity ?? "info",
      timestamp
    };

    this.snapshot = {
      ...snapshot,
      status: input.status ?? snapshot.status,
      updatedAt: timestamp,
      latestEvent: event,
      eventCount: snapshot.eventCount + 1
    };

    await this.persistSnapshot();
    this.broadcast({
      type: "run.event",
      snapshot: this.snapshot,
      event
    });

    return this.snapshot;
  }

  async getSnapshot() {
    return this.loadSnapshot();
  }

  async reset() {
    this.snapshot = null;
    await this.ctx.storage.delete(SNAPSHOT_STORAGE_KEY);

    for (const socket of this.sockets) {
      try {
        socket.close(1012, "run reset");
      } catch (error) {
        console.warn("Failed to close coordinator socket during reset", error);
      }
    }

    this.sockets.clear();
  }

  async fetch(request: Request) {
    const snapshot = await this.loadSnapshot();

    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json(
        {
          snapshot
        },
        { status: 200 }
      );
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.sockets.add(server);
    await this.updateSocketCount();

    server.addEventListener("close", () => {
      this.sockets.delete(server);
      void this.updateSocketCount();
    });

    server.addEventListener("error", () => {
      this.sockets.delete(server);
      void this.updateSocketCount();
    });

    server.send(
      JSON.stringify({
        type: "run.snapshot",
        snapshot
      })
    );

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private async requireSnapshot() {
    const snapshot = await this.loadSnapshot();

    if (!snapshot) {
      throw new Error("RunCoordinatorDO was not initialized before use.");
    }

    return snapshot;
  }

  private async updateSocketCount() {
    if (!this.snapshot) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      websocketCount: this.sockets.size,
      updatedAt: new Date().toISOString()
    };
    await this.persistSnapshot();
  }

  private async persistSnapshot() {
    if (!this.snapshot) {
      return;
    }

    await this.ctx.storage.put(SNAPSHOT_STORAGE_KEY, this.snapshot);
  }

  private async loadSnapshot() {
    if (this.snapshot) {
      return this.snapshot;
    }

    this.snapshot =
      (await this.ctx.storage.get<RunCoordinatorSnapshot>(SNAPSHOT_STORAGE_KEY)) ?? null;

    return this.snapshot;
  }

  private broadcast(message: Record<string, unknown>) {
    const serialized = JSON.stringify(message);

    for (const socket of this.sockets) {
      try {
        socket.send(serialized);
      } catch (error) {
        console.warn("Failed to broadcast to coordinator socket", error);
        this.sockets.delete(socket);
      }
    }
  }
}
