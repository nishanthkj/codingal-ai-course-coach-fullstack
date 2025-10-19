import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function StartAttemptDialog({
  open,
  onOpenChange,
  onConfirm,
  error,
  setError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  error: string | null;
  setError: (v: string | null) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle>Start attempt</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-600">
            Timer will run for 60 seconds.
          </DialogDescription>
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </DialogHeader>

        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Start
          </Button>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
