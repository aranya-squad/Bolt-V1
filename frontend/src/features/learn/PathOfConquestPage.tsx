import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLevel } from "@/shared/api/queries/useLevels";
import { useLessons } from "@/shared/api/queries/useLessons";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { BreadcrumbChip } from "@/shared/ui/BreadcrumbChip";
import { ClassAccordion } from "@/shared/ui/ClassAccordion";
import { TopicRow } from "@/shared/ui/TopicRow";
import { Skeleton } from "@/shared/ui/Skeleton";
import { BoltButton } from "@/shared/ui/BoltButton";
import { PathNode } from "@/shared/ui/PathNode";
import { PathClassDivider } from "@/shared/ui/PathClassDivider";
import { getRankName } from "@/shared/lib/rankNames";

export default function PathOfConquestPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get("view");
  const { data: level, isLoading: levelLoading } = useLevel(levelId!);
  const {
    data: lessons,
    isLoading: lessonsLoading,
    isError: lessonsError,
    refetch,
  } = useLessons(levelId!);

  useEffect(() => {
    if (level?.is_locked) {
      navigate("/learn", { replace: true });
    }
  }, [level, navigate]);

  const isLoading = levelLoading || lessonsLoading;

  return (
    <>
      <AmbientScene accents={["yellow", "blue"]} />
      <Page>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "var(--s-lg)" }}>
          <BreadcrumbChip
            items={[
              "LEARN",
              level ? `LEVEL ${level.order} — ${getRankName(level.order)}` : "…",
            ]}
          />
        </div>

        {/* Level title */}
        {level && (
          <header style={{ marginBottom: "var(--s-xl)" }}>
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: 11,
                letterSpacing: "0.15em",
                color: "var(--y-bolt)",
                textTransform: "uppercase",
                marginBottom: "var(--s-sm)",
              }}
            >
              {getRankName(level.order)}
            </div>
            <h1
              className="t-h1"
              style={{ color: "var(--fg-bone)", textTransform: "uppercase", marginBottom: 0 }}
            >
              {level.name}
            </h1>
            {level.description && (
              <p className="t-body-md" style={{ marginTop: "var(--s-sm)", color: "var(--fg-sand)" }}>
                {level.description}
              </p>
            )}
          </header>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-md)" }}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height={120} radius={16} />
            ))}
          </div>
        )}

        {/* Error state */}
        {lessonsError && !isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-md)",
              alignItems: "flex-start",
            }}
          >
            <p className="t-body-md" style={{ color: "var(--err)", margin: 0 }}>
              Failed to load lessons.
            </p>
            <BoltButton variant="ghost" size="sm" onClick={() => refetch()}>
              RETRY
            </BoltButton>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !lessonsError && lessons && lessons.length === 0 && (
          <p className="t-body-md" style={{ color: "var(--fg-sand)" }}>
            No lessons available for this level yet.
          </p>
        )}

        {/* Lesson list — accordion (default) or snaking path (?view=path) */}
        {!isLoading && !lessonsError && lessons && lessons.length > 0 && (
          viewMode === "path" ? (
            <div className="path-container">
              <PathClassDivider label={level ? `LEVEL ${level.order}` : "LESSONS"} />
              {lessons.map((lesson, i) => (
                <PathNode
                  key={lesson.id}
                  lesson={lesson}
                  levelId={levelId!}
                  side={i % 2 === 0 ? "left" : "right"}
                  onClick={lesson.is_locked ? undefined : () => navigate(`/learn/level/${levelId}/lesson/${lesson.id}/classwork`)}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-md)" }}>
              {lessons.map((lesson) => (
                <ClassAccordion
                  key={lesson.id}
                  title={lesson.name}
                  subtitle={lesson.description || undefined}
                  defaultOpen={!lesson.is_locked}
                >
                  <TopicRow
                    label="CLASSWORK"
                    completed={lesson.classwork_completed}
                    accuracyPct={lesson.classwork_accuracy_pct}
                    locked={lesson.is_locked}
                    onClick={() =>
                      navigate(
                        `/learn/level/${levelId}/lesson/${lesson.id}/classwork`
                      )
                    }
                  />
                  <TopicRow
                    label="HOMEWORK"
                    completed={lesson.homework_completed}
                    locked={lesson.is_locked || !lesson.classwork_completed}
                  />
                </ClassAccordion>
              ))}
            </div>
          )
        )}
      </Page>
    </>
  );
}
