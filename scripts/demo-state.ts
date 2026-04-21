import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type PersistedDemoState = {
  baseUrl?: string;
  runId?: string;
  executionEngine?: string;
  savedAt?: string;
};

export function resolveDemoStatePath() {
  return process.env.KEYSTONE_DEMO_STATE_PATH ?? resolve(process.cwd(), ".keystone", "demo-last-run.json");
}

export async function readDemoState() {
  try {
    const rawState = await readFile(resolveDemoStatePath(), "utf8");
    const parsedState = JSON.parse(rawState) as unknown;

    return parsedState && typeof parsedState === "object"
      ? (parsedState as PersistedDemoState)
      : undefined;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export async function writeDemoState(state: PersistedDemoState) {
  const statePath = resolveDemoStatePath();

  await mkdir(dirname(statePath), {
    recursive: true
  });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  return statePath;
}
