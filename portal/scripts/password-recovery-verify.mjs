import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real callback with a stubbed Auth service, without sending emails
// or modifying any live accounts.
const source = readFileSync(new URL("../src/app/auth/callback/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
let calls = [];
let authError = null;
const auth = {
  async exchangeCodeForSession(code) {
    calls.push(["code", code]);
    return { error: authError };
  },
  async verifyOtp(options) {
    calls.push(["otp", options]);
    return { error: authError };
  },
};
const exports = {};
vm.runInNewContext(outputText, {
  exports,
  URL,
  require(name) {
    if (name === "next/server") return { NextResponse: { redirect: (url) => url } };
    if (name.endsWith("route-handler")) return { createRouteHandlerSupabaseClient: async () => ({ auth }) };
    if (name.endsWith("safe-redirect")) return {
      safeRedirectPath: (value) => value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : null,
    };
    throw new Error(`Unexpected import: ${name}`);
  },
});
async function callback(query) {
  calls = [];
  return exports.GET({ url: `https://portal.example/auth/callback${query}` });
}
assert.equal((await callback("?code=valid")).pathname, "/reset-password");
assert.equal(calls[0][0], "code");
assert.equal((await callback("?token_hash=valid&type=recovery")).pathname, "/reset-password");
assert.equal(calls[0][0], "otp");
assert.equal(calls[0][1].type, "recovery");
assert.equal((await callback("")).pathname, "/reset-password");
assert.equal(calls.length, 0);
assert.ok((await callback("?error=access_denied")).searchParams.has("error"));
assert.equal(calls.length, 0);
assert.ok((await callback("?token_hash=bad&type=signup")).searchParams.has("error"));
assert.equal(calls.length, 0);
authError = { message: "expired" };
assert.ok((await callback("?code=expired")).searchParams.has("error"));
authError = null;
const external = await callback("?code=valid&next=https://evil.example");
assert.equal(external.origin, "https://portal.example");
assert.equal(external.pathname, "/reset-password");
console.log("Password recovery callback: 7 scenarios passed.");
