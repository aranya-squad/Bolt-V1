import { useRef } from "react";

const PIN_BOX = 52;

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function PinInput({ value, onChange, label = "PIN" }: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-label)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-sand)",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{ display: "flex", gap: 10, justifyContent: "center", cursor: "text" }}
        onClick={() => inputRef.current?.focus()}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: PIN_BOX,
              height: PIN_BOX,
              borderRadius: "var(--r-lg)",
              border: `2px solid ${value.length === i ? "var(--y-bolt)" : value[i] ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
              background: value[i] ? "rgba(250,204,21,0.08)" : "rgba(53,53,52,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--fg-bone)",
              transition: "border-color 150ms, background 150ms",
            }}
          >
            {value[i] ? "•" : ""}
          </div>
        ))}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          aria-label="4-digit PIN"
          autoComplete="one-time-code"
        />
      </div>
    </div>
  );
}
