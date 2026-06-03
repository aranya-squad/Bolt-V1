// Bolt Abacus Design System — ConfigSlider
// GlassCard wrapper for Slider with t-label header.
import type { CSSProperties } from "react";
import { GlassCard } from "./GlassCard";
import { Slider } from "./Slider";

interface ConfigSliderProps {
  label: string;
  icon?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  disabled?: boolean;
  description?: string;
  style?: CSSProperties;
}

export function ConfigSlider({ label, style, ...sliderProps }: ConfigSliderProps) {
  return (
    <GlassCard style={{ marginBottom: "var(--s-md)", ...style }}>
      <Slider label={label} {...sliderProps} />
    </GlassCard>
  );
}
