// Bolt Abacus Design System — PathNode
import type { LessonWithCompletion } from "@/shared/types";

interface PathNodeProps {
  lesson: LessonWithCompletion;
  levelId: string;
  side: "left" | "right";
  onClick?: () => void;
}

export function PathNode({ lesson, levelId: _levelId, side, onClick }: PathNodeProps) {
  const isCompleted = lesson.classwork_completed;
  const isCurrent = !lesson.is_locked && !isCompleted;
  const isLocked = lesson.is_locked;

  const statusClass = isCompleted
    ? "path-node--completed"
    : isCurrent
    ? "path-node--current"
    : "path-node--locked";

  const sideClass = side === "left" ? "path-node--left" : "path-node--right";

  return (
    <button
      type="button"
      className={`path-node ${sideClass} ${statusClass}`}
      onClick={onClick}
      disabled={isLocked}
      aria-label={lesson.name}
    >
      <div className="path-node__dot" />
      <span className="path-node__label">{lesson.name}</span>
    </button>
  );
}
