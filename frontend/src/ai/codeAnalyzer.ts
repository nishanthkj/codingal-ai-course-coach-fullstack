// src/ai/codeAnalyzer.ts
// Unified static analyzer. Parses with babel/espree/acorn and reports issues.
// Rules implemented (deterministic heuristics):
//  - unused-variable
//  - off-by-one-for
//  - missing-return
//  - duplicate-block (naive window fingerprint)
//  - console-log
//  - missing-semicolon (heuristic, low-noise)
// Usage: analyzeCode(code, { parser: 'babel'|'espree'|'acorn' })

export type Issue = {
  rule: string;
  message: string;
  loc?: { line: number; column: number } | null;
  suggestion?: string;
  severity?: "info" | "warn" | "error";
};

export type AnalyzeOptions = {
  parser?: "babel" | "espree" | "acorn";
};

function makeIssue(
  rule: string,
  message: string,
  loc?: any,
  suggestion?: string,
  severity: Issue["severity"] = "info"
): Issue {
  return { rule, message, loc: loc ?? null, suggestion, severity };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export async function analyzeCode(code: string, opts: AnalyzeOptions = { parser: "babel" }) {
  const parser = opts.parser ?? "babel";
  let ast: any = null;
  const issues: Issue[] = [];

  // Parse with chosen parser and normalize AST shape expectations
  try {
    switch (parser) {
      case "espree": {
        const espree = await import("espree");
        ast = espree.parse(code, {
          ecmaVersion: "latest",
          sourceType: "module",
          ecmaFeatures: { jsx: true },
          loc: true,
          range: true,
          tokens: true,
        });
        break;
      }
      case "acorn": {
        const acorn = await import("acorn");
        ast = acorn.parse(code, {
          ecmaVersion: "latest",
          sourceType: "module",
          locations: true,
          ranges: true,
        });
        break;
      }
      case "babel":
      default: {
        const babelParser = await import("@babel/parser");
        ast = babelParser.parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          ranges: true,
          tokens: true,
          allowReturnOutsideFunction: false,
          errorRecovery: true as any,
        });
        break;
      }
    }
  } catch (err: any) {
    issues.push(makeIssue("syntax-error", String(err?.message ?? err), undefined, "Fix syntax error", "error"));
    return { issues };
  }

  // walker
  const { walk } = await import("estree-walker");

  // Scope tracking that supports lookup up the chain
  type Scope = { declared: Set<string>; used: Set<string> };
  const scopeStack: Scope[] = [];

  function enterScope() {
    scopeStack.push({ declared: new Set(), used: new Set() });
  }
  function exitScope(node?: any) {
    const s = scopeStack.pop();
    if (!s) return;
    for (const name of s.declared) {
      if (!s.used.has(name)) {
        // location: try to find declaration node location if available
        issues.push(makeIssue("unused-variable", `Variable "${name}" is declared but never used.`, node?.loc ?? null, "Remove or use the variable", "info"));
      }
    }
  }

  function declare(name: string) {
    if (!scopeStack.length) enterScope();
    scopeStack[scopeStack.length - 1].declared.add(name);
  }

  // mark usage by finding nearest scope with declared var; otherwise mark global
  function use(name: string) {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i].declared.has(name)) {
        scopeStack[i].used.add(name);
        return;
      }
    }
    if (scopeStack.length) scopeStack[0].used.add(name); // mark global as used
  }

  // helper to get node range-safe slice
  function sliceSrc(node: any) {
    const start = node?.start ?? (node?.range && node.range[0]) ?? null;
    const end = node?.end ?? (node?.range && node.range[1]) ?? null;
    if (start != null && end != null) return code.slice(start, end);
    return "";
  }

  // utility to test identifier declaration contexts robustly
  function isIdentifierDeclaration(node: any, parent: any) {
    if (!parent) return false;
    const pt = parent.type;
    if (pt === "VariableDeclarator" && parent.id === node) return true;
    if ((pt === "FunctionDeclaration" || pt === "FunctionExpression" || pt === "ClassDeclaration") && parent.id === node)
      return true;
    if (pt === "ImportSpecifier" || pt === "ImportDefaultSpecifier" || pt === "ImportNamespaceSpecifier") return true;
    if (pt === "Property" && parent.key === node && parent.computed === false) return true; // object literal key
    if (pt === "MethodDefinition" && parent.key === node && parent.computed === false) return true;
    return false;
  }

  // Collect function nodes to run missing-return check after traversal of that function
  const functionNodesToCheck: any[] = [];

  // Traversal: collect basic issues and scope info
  try {
    walk(ast as any, {
      enter(node: any, parent: any) {
        // open scopes for Program, functions and blocks
        if (
          node.type === "Program" ||
          node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression" ||
          node.type === "BlockStatement" ||
          node.type === "CatchClause"
        ) {
          enterScope();
          // function params declared
          if (node.params && Array.isArray(node.params)) {
            for (const p of node.params) {
              if (!p) continue;
              if (p.type === "Identifier") declare(p.name);
              // basic patterns: ignore complex patterns for brevity
            }
          }
        }

        // VariableDeclarator -> declare identifier names (simple identifiers)
        if (node.type === "VariableDeclarator" && node.id && node.id.type === "Identifier") {
          declare(node.id.name);
        }

        // FunctionDeclaration name is declared in current scope
        if (node.type === "FunctionDeclaration" && node.id && node.id.type === "Identifier") {
          declare(node.id.name);
        }

        // Identifier usage: skip declarations and object property keys and import specifiers
        if (node.type === "Identifier") {
          if (!isIdentifierDeclaration(node, parent)) {
            // also skip MemberExpression property when not computed (obj.prop -> 'prop' should not be counted)
            if (parent && parent.type === "MemberExpression" && parent.property === node && parent.computed === false) {
              // skip
            } else {
              use(node.name);
            }
          }
        }

        // console.log detection
        if (node.type === "CallExpression") {
          const callee = node.callee;
          if (callee && callee.type === "MemberExpression") {
            const obj = callee.object;
            const prop = callee.property;
            const objName = obj && obj.type === "Identifier" ? obj.name : null;
            const propName = prop && prop.type === "Identifier" ? prop.name : null;
            if (objName === "console" && propName === "log") {
              issues.push(makeIssue("console-log", "console.log found. Remove or replace with logger.", node.loc ?? null, "Use a logger or remove debug prints", "info"));
            }
          }
        }

        // missing-semicolon heuristic (low severity). Check ExpressionStatement line end.
        if (node.type === "ExpressionStatement" && node.loc) {
          try {
            // pick the end line's text
            const endLineIndex = node.loc.end.line - 1;
            const srcLines = code.split(/\r?\n/);
            const lineText = srcLines[endLineIndex] ?? "";
            const trimmed = lineText.trim();
            // ignore single-expression arrow functions, object/array starts/ends, and lines that obviously end with block markers
            if (trimmed && !trimmed.endsWith(";") && !trimmed.endsWith("{") && !trimmed.endsWith("}") && !trimmed.endsWith(",")) {
              // try to reduce false positives: if code uses semicolon-free style widely avoid flagging by requiring presence of other semicolons absent
              issues.push(makeIssue("missing-semicolon", `Possible missing semicolon at line ${endLineIndex + 1}`, node.loc ?? null, "Add a semicolon if required by style", "info"));
            }
          } catch {}
        }

        // Off-by-one detection for ForStatement: AST-aware
        if (node.type === "ForStatement" && node.test && node.test.type === "BinaryExpression") {
          const t = node.test;
          const right = t.right;
          // match patterns like i <= arr.length - 1  OR i <= arr.length
          const isLengthAccess =
            right &&
            (right.type === "MemberExpression" && right.property && ((right.property.type === "Identifier" && right.property.name === "length") || (right.property.type === "Literal" && right.property.value === "length"))) ||
            (right.type === "BinaryExpression" && right.right && right.right.type === "Literal" && right.right.value === 1 && right.left && right.left.type === "MemberExpression" && right.left.property?.name === "length");
          if (isLengthAccess && t.operator === "<=") {
            issues.push(makeIssue("off-by-one-for", "Loop uses '<=' with .length which may be off-by-one when iterating by index.", t.loc ?? null, "Use '<' with array.length or adjust start/end appropriately", "warn"));
          }
        }

        // collect functions for missing-return checking later
        if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
          functionNodesToCheck.push(node);
        }
      },
      leave(node: any) {
        // when leaving scopes, perform exit handling
        if (
          node.type === "Program" ||
          node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression" ||
          node.type === "BlockStatement" ||
          node.type === "CatchClause"
        ) {
          exitScope(node);
        }
      },
    });
  } catch (err: any) {
    issues.push(makeIssue("analyzer-error", String(err?.message ?? err), undefined, undefined, "error"));
  }

  // Missing-return: check each function node deterministically
  try {
    const { walk: innerWalk } = await import("estree-walker");
    for (const fn of functionNodesToCheck) {
      // only check block-bodied functions (not concise arrow expressions)
      const body = fn.body && fn.body.type === "BlockStatement" ? fn.body.body : null;
      if (!Array.isArray(body) || body.length === 0) continue;

      let hasValueReturn = false;
      let hasAnyReturn = false;
      innerWalk(fn, {
        enter(n: any) {
          if (n.type === "ReturnStatement") {
            hasAnyReturn = true;
            if (n.argument) hasValueReturn = true;
          }
        },
      });

      // if any return returns a value but function can exit without returning value, warn
      const lastStmt = body[body.length - 1];
      const lastIsReturn = lastStmt && lastStmt.type === "ReturnStatement";
      if (hasValueReturn && !lastIsReturn) {
        issues.push(makeIssue("missing-return", "Function returns a value on some paths but does not return at end of function.", fn.loc ?? null, "Ensure function returns a value on all code paths", "warn"));
      }
    }
  } catch (err: any) {
    // non-fatal
  }

  // Duplicate block detection (naive structural fingerprint)
  try {
    // Build a compact structural fingerprint for small windows of statements.
    // Avoid heavy generation for large files.
    const MAX_BYTES_FOR_DUP = 200_000;
    if (code.length < MAX_BYTES_FOR_DUP) {
      const fragMap = new Map<string, number>();
      walk(ast, {
        enter(node: any, parent: any) {
          if (node.type === "BlockStatement" && Array.isArray(node.body)) {
            const stmts = node.body;
            const WINDOW = 3; // small window
            for (let i = 0; i + WINDOW - 1 < stmts.length; i++) {
              const slice = stmts.slice(i, i + WINDOW);
              // fingerprint: join node types + trimmed token substrings
              const types = slice.map((s: any) => s.type).join("|");
              const texts = slice
                .map((s: any) => {
                  try {
                    const src = sliceSrc(s).replace(/\s+/g, " ").trim().slice(0, 200);
                    return src;
                  } catch {
                    return "";
                  }
                })
                .join("||");
              const key = `${types}::${texts}`;
              fragMap.set(key, (fragMap.get(key) || 0) + 1);
            }
          }
        },
      });
      for (const [k, count] of fragMap.entries()) {
        if (count > 1) {
          issues.push(makeIssue("duplicate-block", `Similar code block appears ${count} times. Consider extracting a function.`, null, "Extract repeated logic", "warn"));
        }
      }
    }
  } catch {}

  // Deduplicate issues by rule, message and line to preserve separate locations
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const it of issues) {
    const locKey = it.loc && typeof it.loc === "object" && it.loc.line ? `@${it.loc.line}:${it.loc.column ?? 0}` : "";
    const key = `${it.rule}::${it.message}::${locKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }

  return { issues: out };
}
