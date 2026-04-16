export interface WorkspaceSeedFile {
  path: string;
  content: string;
}

export const demoTargetFixtureFiles: WorkspaceSeedFile[] = [
  {
    path: "README.md",
    content:
      "# Demo Target\n\nThis fixture repository is the deterministic Keystone M1 target. Later phases will use it to prove compile, task execution, integration, and verification against a known local baseline.\n"
  },
  {
    path: "package.json",
    content:
      '{\n  "name": "keystone-demo-target",\n  "version": "0.1.0",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n'
  },
  {
    path: "src/greeting.js",
    content: 'export function makeGreeting(name = "Keystone") {\n  return `Hello, ${name}.`;\n}\n'
  },
  {
    path: "tests/greeting.test.js",
    content:
      'import test from "node:test";\nimport assert from "node:assert/strict";\n\nimport { makeGreeting } from "../src/greeting.js";\n\ntest("makeGreeting uses the provided name", () => {\n  assert.equal(makeGreeting("Operator"), "Hello, Operator.");\n});\n'
  }
];
