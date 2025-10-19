import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Issue = {
  rule: string;
  message: string;
  loc?: { line: number; column: number };
  suggestion?: string;
  severity?: string;
};

export default function CodeViewer({
  runAnalysis,
  issues,
}: {
  runAnalysis?: (snippet: string) => Promise<any[]>;
  issues?: Issue[];
}) {
  const [code, setCode] = useState("");
  const [analysisType, setAnalysisType] = useState<
    "static" | "backend" | "both"
  >("static");
  const [running, setRunning] = useState(false);
  const [localIssues, setLocalIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setError(null);
    setLocalIssues([]);
    try {
      if (runAnalysis) {
        // parent handles client+backend if implemented
        const merged = await runAnalysis(code);
        setLocalIssues(Array.isArray(merged) ? merged : []);
      } else {
        setLocalIssues([]);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Code Attempt Viewer</h2>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Choose analyzer:</span>
          <Select
            value={analysisType}
            onValueChange={(v) => setAnalysisType(v as any)}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Select analyzer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label htmlFor="code-snippet" className="sr-only">
        JavaScript snippet
      </label>
      <textarea
        id="code-snippet"
        aria-label="JavaScript code snippet"
        placeholder={`function add(a, b) {\n  return a + b;\n}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full min-h-[160px] rounded-md border p-3 text-sm"
      />

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={handleRun}
          disabled={running || !code.trim()}
        >
          {running ? "Analyzing..." : "Run Analysis"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCode("");
            setLocalIssues([]);
            setError(null);
          }}
        >
          Clear
        </Button>
      </div>

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

      {(issues && issues.length > 0 ? issues : localIssues).length > 0 ? (
        <div className="mt-4">
          <h3 className="text-md font-semibold">Issues</h3>
          <ul className="mt-2 space-y-2">
            {(issues && issues.length > 0 ? issues : localIssues).map(
              (it, i) => (
                <li key={i} className="p-2 border rounded">
                  <div className="font-medium">{it.rule}</div>
                  <div className="text-xs text-gray-600">{it.message}</div>
                  {it.suggestion && (
                    <div className="text-xs text-gray-500 mt-1">
                      Fix: {it.suggestion}
                    </div>
                  )}
                  {it.loc && (
                    <div className="text-xs text-gray-400 mt-1">
                      Line: {it.loc.line}
                    </div>
                  )}
                </li>
              )
            )}
          </ul>
        </div>
      ) : (
        !running &&
        code.trim() && (
          <div className="text-sm text-green-600 mt-3">No issues found.</div>
        )
      )}
    </div>
  );
}
