// Bolt Abacus Design System — HudStatTile
// Hero/HUD stat: icon + big number + uppercase label. Use for prominent stat strips
// (e.g. Hub). For compact value+label rows without an icon, use ResultStatTile.
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icon";

interface HudStatTileProps {
  icon: string;
  value: string;
  label: string;
  color: string;
}

export function HudStatTile({ icon, value, label, color }: HudStatTileProps) {
  return (
    <GlassCard variant="default" style={{ flex: 1, textAlign: "center", padding: "20px var(--s-lg)" }}>
      <Icon name={icon} size={22} color={color} style={{ margin: "0 auto 10px" }} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          color,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontSize: 11,
          color: "var(--fg-sand)",
          marginTop: 6,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </GlassCard>
  );
}
