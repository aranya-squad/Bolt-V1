// Bolt Abacus Design System — Avatar
interface AvatarProps {
  src?: string;
  active?: boolean;
  size?: number;
}

export function Avatar({ src, active = false, size = 40 }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: src ? `url(${src}) center/cover` : "var(--bg-ash)",
        border: active ? "2px solid var(--y-bolt)" : "2px solid rgba(255,255,255,0.15)",
        boxShadow: active ? "0 0 12px rgba(250,204,21,0.45)" : "none",
        flexShrink: 0,
      }}
    />
  );
}
