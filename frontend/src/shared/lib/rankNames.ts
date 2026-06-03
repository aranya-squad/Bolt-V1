export const RANK_NAMES: Record<number, string> = {
  1: "INITIATE",
  2: "APPRENTICE",
  3: "STRIKER",
  4: "CHALLENGER",
  5: "WARRIOR",
  6: "ELITE",
  7: "CHAMPION",
  8: "MASTER",
  9: "GRANDMASTER",
  10: "LEGEND",
};

export function getRankName(order: number): string {
  return RANK_NAMES[order] ?? `LVL ${order}`;
}
