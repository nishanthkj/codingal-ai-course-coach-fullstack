import React from "react";
import { Button } from "@/components/ui/button";

export default function TimerIndicator({
  isRunning,
  countdown,
  onStop,
  lastAttemptId,
}: {
  isRunning: boolean;
  countdown: number;
  onStop: () => void;
  lastAttemptId: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      {isRunning ? (
        <>
          <div className="text-sm text-indigo-600">Attempt running — {countdown}s left</div>
          <Button size="sm" variant="ghost" onClick={onStop}>
            Stop
          </Button>
        </>
      ) : lastAttemptId ? (
        <div className="text-sm text-indigo-600">Last attempt ID: {lastAttemptId}</div>
      ) : null}
    </div>
  );
}
