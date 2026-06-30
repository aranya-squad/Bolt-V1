import { useState } from "react";

export type ArenaOperation = "MIXED" | "ADD" | "SUB" | "MUL" | "DIV";
export type ArenaMode = "FLASH_CARDS" | "ZEN" | "TIME_ATTACK" | "CUSTOM";

interface ArenaConfig {
  operation: ArenaOperation;
  mode: ArenaMode;
  questions: number;
  digits: number;      // ADD/SUB/MIXED operand digit count
  digitsRow1: number;  // MUL/DIV row-1 (multiplicand/dividend) digit count (D-6)
  digitsRow2: number;  // MUL/DIV row-2 (multiplier/divisor) digit count (D-6)
  rows: number;
  timeLimitMin: number;
  flashSpeedMs: number;
}

const DEFAULTS: ArenaConfig = {
  operation: "MIXED",
  mode: "FLASH_CARDS",
  questions: 20,
  digits: 2,
  digitsRow1: 2,
  digitsRow2: 1,
  rows: 2,
  timeLimitMin: 2,
  flashSpeedMs: 2000,
};

export interface UseArenaConfigReturn {
  config: ArenaConfig;
  setOperation: (op: ArenaOperation) => void;
  setMode: (mode: ArenaMode) => void;
  setQuestions: (n: number) => void;
  setDigits: (n: number) => void;
  setDigitsRow1: (n: number) => void;
  setDigitsRow2: (n: number) => void;
  setRows: (n: number) => void;
  setTimeLimitMin: (n: number) => void;
  setFlashSpeedMs: (n: number) => void;
  toPracticePayload: () => import("@/shared/api/queries/usePractice").PracticeConfig;
}

export function useArenaConfig(): UseArenaConfigReturn {
  const [config, setConfig] = useState<ArenaConfig>(DEFAULTS);

  const setOperation = (operation: ArenaOperation) => setConfig((c) => ({ ...c, operation }));
  const setMode = (mode: ArenaMode) => setConfig((c) => ({
    ...c,
    mode,
    // Flash cards don't support MUL/DIV (D-5). Coerce to MIXED so the config stays valid.
    operation: mode === "FLASH_CARDS" && (c.operation === "MUL" || c.operation === "DIV") ? "MIXED" : c.operation,
  }));
  const setQuestions = (questions: number) => setConfig((c) => ({ ...c, questions }));
  const setDigits = (digits: number) => setConfig((c) => ({ ...c, digits }));
  const setDigitsRow1 = (digitsRow1: number) => setConfig((c) => ({ ...c, digitsRow1 }));
  const setDigitsRow2 = (digitsRow2: number) => setConfig((c) => ({ ...c, digitsRow2 }));
  const setRows = (rows: number) => setConfig((c) => ({ ...c, rows }));
  const setTimeLimitMin = (timeLimitMin: number) => setConfig((c) => ({ ...c, timeLimitMin }));
  const setFlashSpeedMs = (flashSpeedMs: number) => setConfig((c) => ({ ...c, flashSpeedMs }));

  const isMulDiv = config.operation === "MUL" || config.operation === "DIV";

  const toPracticePayload = () => ({
    mode: config.mode,
    operation: config.operation,
    digits: config.digits,
    rows: config.rows,
    question_count: config.questions,
    // ZEN and CUSTOM: no timer (0 = unlimited). TIME_ATTACK: user-set limit.
    time_limit_sec: config.mode === "ZEN" || config.mode === "CUSTOM" ? 0 : config.timeLimitMin * 60,
    // Flash cards: include per-card speed (D-5); backend validates and stores it.
    ...(config.mode === "FLASH_CARDS" ? { flash_speed_ms: config.flashSpeedMs } : {}),
    // MUL/DIV per-row digit config (D-6); backend validates bounds and stores them.
    ...(isMulDiv ? { digits_row1: config.digitsRow1, digits_row2: config.digitsRow2 } : {}),
  });

  return {
    config,
    setOperation,
    setMode,
    setQuestions,
    setDigits,
    setDigitsRow1,
    setDigitsRow2,
    setRows,
    setTimeLimitMin,
    setFlashSpeedMs,
    toPracticePayload,
  };
}
