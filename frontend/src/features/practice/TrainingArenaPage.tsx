import { useNavigate } from "react-router-dom";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { ConfigSlider } from "@/shared/ui/ConfigSlider";
import { Icon } from "@/shared/ui/Icon";
import { useStartPractice } from "@/shared/api/queries/usePractice";
import { useArenaConfig, type ArenaOperation, type ArenaMode } from "./useArenaConfig";

const OPERATIONS: { value: ArenaOperation; label: string; icon: string }[] = [
  { value: "MIXED",  label: "Add & Subtract",  icon: "plus" },
  { value: "MUL",    label: "Multiplication",   icon: "x" },
  { value: "DIV",    label: "Division",          icon: "divide" },
];

// The Lab unlocks individual ADD and SUB on top of the standard three.
const LAB_OPERATIONS: { value: ArenaOperation; label: string; icon: string }[] = [
  { value: "ADD",    label: "Addition",          icon: "plus" },
  { value: "SUB",    label: "Subtraction",        icon: "minus" },
  { value: "MIXED",  label: "Add & Subtract",    icon: "layers" },
  { value: "MUL",    label: "Multiplication",     icon: "x" },
  { value: "DIV",    label: "Division",           icon: "divide" },
];

const MODES: { value: ArenaMode; label: string; description: string; icon: string; color: string }[] = [
  {
    value: "FLASH_CARDS",
    label: "Flash Cards",
    description: "Speed drills with flash card timing",
    icon: "zap",
    color: "var(--y-bolt)",
  },
  {
    value: "ZEN",
    label: "No Rush Mastery",
    description: "No timer. Pure focus and accuracy.",
    icon: "wind",
    color: "var(--bolt-blue)",
  },
  {
    value: "TIME_ATTACK",
    label: "Time Attack",
    description: "Race the clock and push your limits",
    icon: "timer",
    color: "var(--orange-streak)",
  },
  {
    value: "CUSTOM",
    label: "The Lab",
    description: "Your rules. Pick any operation, digit range, and question count.",
    icon: "flask-conical",
    color: "var(--ok-50)",
  },
];

const STEP_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "0.7rem",
  letterSpacing: "0.15em",
  color: "var(--fg-sand)",
  textTransform: "uppercase",
  marginBottom: "var(--s-sm)",
};

function OperationChip({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "var(--s-md) var(--s-sm)",
        borderRadius: "var(--r-lg)",
        background: selected ? "rgba(250,204,21,0.12)" : "rgba(53,53,52,0.6)",
        border: selected
          ? "1px solid var(--y-bolt)"
          : "1px solid rgba(255,255,255,0.08)",
        color: selected ? "var(--y-bolt)" : "var(--fg-sand)",
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        transition: "border-color 180ms, background 180ms, color 180ms",
        boxShadow: selected ? "0 0 12px rgba(250,204,21,0.2)" : "none",
      }}
    >
      <Icon name={icon} size={18} color={selected ? "var(--y-bolt)" : "var(--fg-sand)"} />
      {label}
    </button>
  );
}

function ModeCard({
  label,
  description,
  icon,
  color,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "var(--s-lg) var(--s-md)",
        borderRadius: "var(--r-xl)",
        background: selected ? "rgba(250,204,21,0.06)" : "var(--glass-05)",
        backdropFilter: "var(--blur-glass)",
        WebkitBackdropFilter: "var(--blur-glass)",
        border: selected
          ? "1px solid var(--y-bolt)"
          : "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        boxShadow: selected ? "0 0 18px rgba(250,204,21,0.15)" : "none",
        transition: "border-color 180ms, box-shadow 180ms, background 180ms",
      }}
    >
      {selected && (
        <span style={{ position: "absolute", top: 10, right: 10 }}>
          <Icon name="check-circle-2" size={16} color="var(--y-bolt)" />
        </span>
      )}
      <Icon name={icon} size={24} color={color} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.9rem",
          color: "var(--fg-bone)",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div className="t-body-sm" style={{ color: "var(--fg-sand)", lineHeight: 1.5 }}>
        {description}
      </div>
    </button>
  );
}

export default function TrainingArenaPage() {
  const navigate = useNavigate();
  const { config, setOperation, setMode, setQuestions, setDigits, setRows, setTimeLimitMin, setFlashSpeedMs, toPracticePayload } =
    useArenaConfig();
  const { mutate: startPractice, isPending, isError } = useStartPractice();

  const isMulDiv = config.operation === "MUL" || config.operation === "DIV";
  const effectiveRows = isMulDiv ? 2 : config.rows;

  const handleStart = () => {
    const payload = toPracticePayload();
    startPractice(
      { ...payload, rows: effectiveRows },
      {
        onSuccess: (session) => {
          navigate(`/practice/session/${session.session_id}`);
        },
      }
    );
  };

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AmbientScene accents={["orange", "blue", "purple"] as any} />
      <Page>
        <div style={{ maxWidth: 600 }}>
        <h1
          className="t-h1"
          style={{ color: "var(--y-bolt)", marginBottom: "var(--s-2xl)" }}
        >
          TRAINING ARENA
        </h1>

        {/* Step 01 — Choose Operation */}
        <div style={{ marginBottom: "var(--s-xl)" }}>
          <div style={STEP_LABEL_STYLE}>Step 01 — Operation</div>
          <div style={{ display: "flex", gap: "var(--s-sm)", flexWrap: config.mode === "CUSTOM" ? "wrap" : "nowrap" }}>
            {(config.mode === "CUSTOM" ? LAB_OPERATIONS : OPERATIONS).map((op) => (
              <OperationChip
                key={op.value}
                label={op.label}
                icon={op.icon}
                selected={config.operation === op.value}
                onClick={() => setOperation(op.value)}
              />
            ))}
          </div>
        </div>

        {/* Step 02 — Combat Style */}
        <div style={{ marginBottom: "var(--s-xl)" }}>
          <div style={STEP_LABEL_STYLE}>Step 02 — Combat Style</div>
          <div
            style={{
              display: "flex",
              gap: "var(--s-sm)",
              flexWrap: "wrap",
            }}
          >
            {MODES.map((m) => (
              <ModeCard
                key={m.value}
                label={m.label}
                description={m.description}
                icon={m.icon}
                color={m.color}
                selected={config.mode === m.value}
                onClick={() => setMode(m.value)}
              />
            ))}
          </div>
        </div>

        {/* Step 03 — Configuration */}
        <div style={{ marginBottom: "var(--s-xl)" }}>
          <div style={STEP_LABEL_STYLE}>Step 03 — Configuration</div>

          <ConfigSlider
            label="QUESTIONS"
            icon="list-ordered"
            min={5}
            max={50}
            step={5}
            value={config.questions}
            onChange={setQuestions}
          />

          {config.mode !== "FLASH_CARDS" && (
            <ConfigSlider
              label="DIGITS"
              icon="hash"
              min={1}
              max={4}
              value={config.digits}
              onChange={setDigits}
            />
          )}

          <ConfigSlider
            label="ROWS"
            icon="rows-3"
            min={2}
            max={5}
            value={effectiveRows}
            onChange={setRows}
            disabled={isMulDiv}
            description={isMulDiv ? "Fixed at 2 rows for multiplication and division" : undefined}
          />

          {config.mode === "FLASH_CARDS" && (
            <ConfigSlider
              label="FLASH SPEED"
              icon="zap"
              min={500}
              max={5000}
              step={500}
              value={config.flashSpeedMs}
              onChange={setFlashSpeedMs}
              suffix="ms"
            />
          )}

          {config.mode === "TIME_ATTACK" && (
            <ConfigSlider
              label="TIME LIMIT"
              icon="timer"
              min={1}
              max={10}
              value={config.timeLimitMin}
              onChange={setTimeLimitMin}
              suffix="min"
            />
          )}

        </div>

        {isError && (
          <p style={{ color: "var(--err)", marginBottom: "var(--s-md)", fontSize: "0.9rem" }}>
            Failed to start session. Please try again.
          </p>
        )}

        <BoltButton
          variant="primary"
          size="lg"
          icon="rocket"
          onClick={handleStart}
          disabled={isPending}
          style={{ width: "100%" }}
        >
          {isPending ? "STARTING…" : "ENTER ARENA"}
        </BoltButton>
        </div>
      </Page>
    </>
  );
}
