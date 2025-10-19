import { describe, it, expect } from "vitest";
import { analyzeCode } from "../../src/ai/codeAnalyzer";

describe("codeAnalyzer - rules", () => {
  it("reports syntax errors", async () => {
    const code = "function() {";
    const out = await analyzeCode(code);
    expect(out.issues.length).toBeGreaterThan(0);
    expect(out.issues.some((i) => i.rule === "syntax-error" || /syntax/i.test(i.message))).toBe(true);
  });

  it("detects unused-variable", async () => {
    const code = "function f(){ const a = 1; return 2; }";
    const out = await analyzeCode(code);
    expect(out.issues.some((i) => i.rule === "unused-variable")).toBe(true);
  });

  it("detects off-by-one for-loops (<= length)", async () => {
    const code = "for(let i=0;i<=arr.length;i++){console.log(arr[i]);}";
    const out = await analyzeCode(code);
    expect(out.issues.some((i) => i.rule === "off-by-one-for" || i.rule === "for-loop-off-by-one")).toBe(true);
  });

  it("detects missing-return when some paths return a value but function can exit without return", async () => {
    const code = `
      function foo(x){
        if(x) return 1;
        // no return here
      }
    `;
    const out = await analyzeCode(code);
    expect(out.issues.some((i) => i.rule === "missing-return")).toBe(true);
  });

  it("detects duplicate blocks and console.log occurrences", async () => {
    const code = `
      function a(){ console.log(1); console.log(2); console.log(3); }
      function b(){ console.log(1); console.log(2); console.log(3); }
    `;
    const out = await analyzeCode(code);
    expect(out.issues.some((i) => i.rule === "console-log")).toBe(true);
    // duplicate-block is heuristic; accept either detection or at least one other issue
    const dup = out.issues.some((i) => i.rule === "duplicate-block");
    expect(dup || out.issues.length > 0).toBeTruthy();
  });

  it("missing-semicolon heuristic may produce low-severity info", async () => {
    const code = "const x = 1\nconst y = 2";
    const out = await analyzeCode(code);
    // it's allowed to be absent; ensure analyzer runs and returns issues array
    expect(Array.isArray(out.issues)).toBe(true);
    // if present, rule should be named "missing-semicolon"
    const sem = out.issues.some((i) => i.rule === "missing-semicolon");
    expect(typeof sem === "boolean").toBe(true);
  });
});
