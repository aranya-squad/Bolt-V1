import { useState } from "react";

export type ArenaOperation = "MIXED" | "MUL" | "DIV";
export type ArenaMode = "FLASH_CARDS" | "ZEN" | "TIME_ATTACK";

interface ArenaConfig {
  operation: ArenaOperation;
  mode: ArenaMode;
  questions: number;
  digits: number;
  rows: number;
  timeLimitMin: number;
  flashSpeedMs: number;
  audio: boolean;
}

const DEFAULTS: ArenaConfig = {
  operation: "MIXED",
  mode: "FLASH_CARDS",
  questions: 20,
  digits: 2,
  rows: 2,
  timeLimitMin: 2,
  flashSpeedMs: 2000,
  audio: false,
};

export interface UseArenaConfigReturn {
  config: ArenaConfig;
  setOperation: (op: ArenaOperation) => void;
  setMode: (mode: ArenaMode) => void;
  setQuestions: (n: number) => void;
  setDigits: (n: number) => void;
  setRows: (n: number) => void;
  setTimeLimitMin: (n: number) => void;
  setFlashSpeedMs: (n: number) => void;
  setAudio: (v: boolean) => void;
  toPracticePayload: () => {
    mode: string;
    operation: string;
    digits: number;
    rows: number;
    question_count: number;
    time_limit_sec: number;
  };
}

export function useArenaConfig(): UseArenaConfigReturn {
  const [config, setConfig] = useState<ArenaConfig>(DEFAULTS);

  const setOperation = (operation: ArenaOperation) => setConfig((c) => ({ ...c, operation }));
  const setMode = (mode: ArenaMode) => setConfig((c) => ({ ...c, mode }));
  const setQuestions = (questions: number) => setConfig((c) => ({ ...c, questions }));
  const setDigits = (digits: number) => setConfig((c) => ({ ...c, digits }));
  const setRows = (rows: number) => setConfig((c) => ({ ...c, rows }));
  const setTimeLimitMin = (timeLimitMin: number) => setConfig((c) => ({ ...c, timeLimitMin }));
  const setFlashSpeedMs = (flashSpeedMs: number) => setConfig((c) => ({ ...c, flashSpeedMs }));
  const setAudio = (audio: boolean) => setConfig((c) => ({ ...c, audio }));

  const toPracticePayload = () => ({
    mode: config.mode,
    operation: config.operation,
    digits: config.digits,
    rows: config.rows,
    question_count: config.questions,
    time_limit_sec: config.mode === "ZEN" ? 0 : config.timeLimitMin * 60,
  });

  return {
    config,
    setOperation,
    setMode,
    setQuestions,
    setDigits,
    setRows,
    setTimeLimitMin,
    setFlashSpeedMs,
    setAudio,
    toPracticePayload,
  };
}
