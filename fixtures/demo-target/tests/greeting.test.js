import test from "node:test";
import assert from "node:assert/strict";

import { makeGreeting } from "../src/greeting.js";

test("makeGreeting uses the provided name", () => {
  assert.equal(makeGreeting("Operator"), "Hello, Operator.");
});
