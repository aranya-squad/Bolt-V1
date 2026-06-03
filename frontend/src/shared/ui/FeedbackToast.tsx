import { useEffect } from "react";
import { Chip } from "./Chip";

interface FeedbackToastProps {
  verdict: "correct" | "wrong" | null;
  xpDelta: number;
  onDismiss?: () => void;
}

export function FeedbackToast({ verdict, xpDelta, onDismiss }: FeedbackToastProps) {
  useEffect(() => {
    if (!verdict) return;
    const id = setTimeout(() => onDismiss?.(), 600);
    return () => clearTimeout(id);
  }, [verdict, onDismiss]);

  if (!verdict) return null;

  return (
    <Chip
      tone={verdict === "correct" ? "ok" : "err"}
      icon={verdict === "correct" ? "check-circle-2" : "x-circle"}
    >
      {verdict === "correct" ? `+${xpDelta} XP` : "RECALCULATE"}
    </Chip>
  );
}
