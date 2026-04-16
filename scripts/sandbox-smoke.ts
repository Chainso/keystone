import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

type DevConfig = {
  KEYSTONE_DEV_TOKEN: string;
  KEYSTONE_DEV_TENANT_ID: string;
};

async function loadDevConfig(): Promise<DevConfig> {
  const candidates = [".dev.vars", ".dev.vars.example"];

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      const entries = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const [key, ...rest] = line.split("=");

          return [key, rest.join("=")] as const;
        });
      const parsed = Object.fromEntries(entries);

      if (parsed.KEYSTONE_DEV_TOKEN && parsed.KEYSTONE_DEV_TENANT_ID) {
        return {
          KEYSTONE_DEV_TOKEN: parsed.KEYSTONE_DEV_TOKEN,
          KEYSTONE_DEV_TENANT_ID: parsed.KEYSTONE_DEV_TENANT_ID
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not load KEYSTONE_DEV_TOKEN and KEYSTONE_DEV_TENANT_ID from .dev.vars or .dev.vars.example.");
}

async function waitForWorker(url: string, token: string, tenantId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Keystone-Tenant-Id": tenantId
        }
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Wait for wrangler and the container image build to complete.
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for local worker at ${url}.`);
}

async function main() {
  const config = await loadDevConfig();
  const port = "8791";
  const baseUrl = `http://127.0.0.1:${port}`;
  const worker = spawn(
    "npx",
    ["wrangler", "dev", "--port", port, "--host", "127.0.0.1"],
    {
      stdio: "inherit",
      env: process.env
    }
  );
  let earlyExit: Error | null = null;

  worker.once("exit", (code, signal) => {
    earlyExit = new Error(
      `wrangler dev exited before the smoke check completed (code=${code ?? "null"}, signal=${signal ?? "null"}).`
    );
  });

  try {
    await Promise.race([
      waitForWorker(`${baseUrl}/v1/health`, config.KEYSTONE_DEV_TOKEN, config.KEYSTONE_DEV_TENANT_ID),
      (async () => {
        while (!earlyExit) {
          await sleep(250);
        }

        throw earlyExit;
      })()
    ]);

    const response = await fetch(`${baseUrl}/internal/dev/sandbox-smoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.KEYSTONE_DEV_TOKEN}`,
        "Content-Type": "application/json",
        "X-Keystone-Tenant-Id": config.KEYSTONE_DEV_TENANT_ID
      }
    });

    if (!response.ok) {
      throw new Error(`Sandbox smoke failed with status ${response.status}: ${await response.text()}`);
    }

    const body = await response.json();
    console.log(JSON.stringify(body, null, 2));
  } finally {
    worker.kill("SIGTERM");
    await sleep(1_000);
  }
}

await main();
