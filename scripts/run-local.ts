interface RunLocalConfig {
  baseUrl: string;
  token: string;
  tenantId: string;
  repo:
    | {
        localPath: string;
      }
    | {
        gitUrl: string;
        ref?: string | undefined;
      };
  decisionPackage:
    | {
        localPath: string;
      }
    | {
        payload: Record<string, unknown>;
      };
}

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function resolveConfig(): RunLocalConfig {
  const repoGitUrl = getArg("repo-git-url");
  const repoRef = getArg("repo-ref");
  const decisionPackagePayload = getArg("decision-package-payload");

  return {
    baseUrl: getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787",
    token: process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token",
    tenantId: process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local",
    repo: repoGitUrl
      ? {
          gitUrl: repoGitUrl,
          ref: repoRef
        }
      : {
          localPath: getArg("repo-local-path") ?? "./fixtures/demo-target"
        },
    decisionPackage: decisionPackagePayload
      ? {
          payload: JSON.parse(decisionPackagePayload)
        }
      : {
          localPath:
            getArg("decision-package-local-path") ??
            "./fixtures/demo-decision-package/decision-package.json"
        }
  };
}

async function main() {
  const config = resolveConfig();
  const response = await fetch(`${config.baseUrl}/v1/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-Keystone-Tenant-Id": config.tenantId
    },
    body: JSON.stringify({
      repo: config.repo,
      decisionPackage: config.decisionPackage
    })
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Run creation failed with ${response.status}: ${body}`);
  }

  console.log(body);
}

await main();
