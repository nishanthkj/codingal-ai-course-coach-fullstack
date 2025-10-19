import React from "react";
import { Button } from "@/components/ui/button";

export default function BackButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = "/";
      }}
    >
      Back
    </Button>
  );
}
